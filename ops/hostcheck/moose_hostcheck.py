#!/usr/bin/env python3
"""moose-hostcheck: daily, read-only VPS health check. No tokens, no network, stdlib only.

Writes  <state>/latest.json, <state>/history/<UTC timestamp>.json (14 days kept),
        <state>/state.json (run/fail counters), and <state>/weekly-<ISO-week Monday>.json once per ISO week.
Exit 0 = the check ran (warnings are in the JSON). Exit 1 = the script itself failed (a check errored or crashed).

Checks: disk per mount (warn > 80%), rollback tags per app, pending -security apt updates, unhealthy/restarting
containers, running image vs last /var/lib/moose-deploys/<app>.jsonl record, unattended-upgrades in the last 48h,
/var/run/reboot-required.

All paths/commands can be overridden with MOOSE_HC_* env vars (used by the tests with fixtures).
"""
import datetime as dt
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import traceback

VERSION = "1.0.0"
E = os.environ.get
STATE_DIR = E("MOOSE_HC_STATE_DIR", "/var/lib/moose-hostcheck")
DEPLOY_DIR = E("MOOSE_HC_DEPLOY_DIR", "/var/lib/moose-deploys")
REBOOT_FILE = E("MOOSE_HC_REBOOT_FILE", "/var/run/reboot-required")
UU_LOG = E("MOOSE_HC_UU_LOG", "/var/log/unattended-upgrades/unattended-upgrades.log")
DISK_WARN_PCT = int(E("MOOSE_HC_DISK_WARN_PCT", "80"))
ROLLBACK_KEEP = int(E("MOOSE_HC_ROLLBACK_KEEP", "3"))
UU_MAX_AGE_H = int(E("MOOSE_HC_UU_MAX_AGE_H", "48"))
HISTORY_DAYS = int(E("MOOSE_HC_HISTORY_DAYS", "14"))
CMD_TIMEOUT = 60
AUTO_TAG = re.compile(r"^(?P<app>[a-z0-9][a-z0-9._/-]*):rollback-[0-9]{8}-[0-9a-f]{7}$")
ANY_ROLLBACK = re.compile(r"^(?P<app>[^\s:]+):rollback-\S+$")
SKIP_FS = {"tmpfs", "devtmpfs", "overlay", "squashfs", "efivarfs", "proc", "sysfs", "nsfs", "tracefs"}


class CheckError(Exception):
    """A check could not run (counts as a script failure, not a warning)."""


def now():
    override = E("MOOSE_HC_NOW")  # tests only
    return dt.datetime.fromisoformat(override) if override else dt.datetime.now(dt.timezone.utc)


def run(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=CMD_TIMEOUT, check=False,
                           env=dict(os.environ, LC_ALL="C"))
    except (OSError, subprocess.TimeoutExpired) as e:
        raise CheckError(f"{cmd[0]}: {type(e).__name__}") from None
    if p.returncode != 0:
        raise CheckError(f"{' '.join(cmd[:3])} exited {p.returncode}: {p.stderr.strip()[:200]}")
    return p.stdout


def short(s, n=200):
    """Untrusted strings (docker names, file contents) are length-capped; json.dumps escapes them."""
    return str(s)[:n]


# ---------------- checks: each returns (status, details, warnings[]) ----------------

def check_disk():
    out = run(["df", "-P", "-T", "-k"])
    mounts, warns = [], []
    for line in out.splitlines()[1:]:
        f = line.split()
        if len(f) < 7 or f[1] in SKIP_FS:
            continue
        try:
            pct = int(f[5].rstrip("%"))
        except ValueError:
            continue
        m = {"mount": short(" ".join(f[6:])), "fs": f[1], "used_pct": pct, "avail_kb": int(f[4])}
        mounts.append(m)
        if pct > DISK_WARN_PCT:
            warns.append(f"disk {m['mount']} at {pct}% (> {DISK_WARN_PCT}%)")
    if not mounts:
        raise CheckError("df returned no real filesystems")
    return ("warn" if warns else "ok"), {"mounts": mounts}, warns


def docker_lines(*args):
    return [l for l in run(["docker", *args]).splitlines() if l.strip()]


def check_rollback_tags():
    per = {}
    for ref in docker_lines("image", "ls", "--format", "{{.Repository}}:{{.Tag}}"):
        m = ANY_ROLLBACK.match(ref)
        if not m:
            continue
        app = short(m.group("app"), 100)
        d = per.setdefault(app, {"auto": 0, "manual": 0})
        d["auto" if AUTO_TAG.match(ref) else "manual"] += 1
    warns = [f"{a}: {d['auto']} auto rollback tags (> {ROLLBACK_KEEP}; retention not working?)"
             for a, d in sorted(per.items()) if d["auto"] > ROLLBACK_KEEP]
    return ("warn" if warns else "ok"), {"apps": per}, warns


def check_apt_security():
    out = run(["apt", "list", "--upgradable"])  # reads the local cache only; apt's own timers refresh it
    pkgs = []
    for line in out.splitlines():
        m = re.match(r"^([a-z0-9][a-z0-9+.-]*)/(\S+)\s+(\S+)", line)
        if m and any(s.endswith("-security") for s in m.group(2).split(",")):
            pkgs.append({"name": m.group(1), "suite": m.group(2), "version": m.group(3)})
    warns = [f"{len(pkgs)} pending security update(s): " + ", ".join(p["name"] for p in pkgs[:10])] if pkgs else []
    return ("warn" if warns else "ok"), {"count": len(pkgs), "packages": pkgs[:50]}, warns


def inspect_containers():
    ids = docker_lines("ps", "-aq", "--no-trunc")
    if not ids:
        return []
    fmt = ('{"name":{{json .Name}},"image":{{json .Image}},"status":{{json .State.Status}},'
           '"restarting":{{json .State.Restarting}},"restart_count":{{json .RestartCount}},'
           '"health":{{if .State.Health}}{{json .State.Health.Status}}{{else}}""{{end}}}')
    out = []
    for line in docker_lines("inspect", "--format", fmt, *ids):
        try:
            c = json.loads(line)
        except json.JSONDecodeError:
            raise CheckError("unparseable docker inspect output") from None
        c["name"] = short(str(c.get("name", "")).lstrip("/"), 128)
        out.append(c)
    return out


def check_containers(containers):
    warns, rows = [], []
    for c in containers:
        rows.append({k: c.get(k) for k in ("name", "status", "health", "restart_count")})
        if c.get("restarting") or c.get("status") == "restarting":
            warns.append(f"{c['name']} is restarting")
        elif c.get("health") == "unhealthy":
            warns.append(f"{c['name']} is unhealthy")
        elif c.get("status") == "running" and int(c.get("restart_count") or 0) > 0:
            warns.append(f"{c['name']} restarted {c['restart_count']} time(s)")
    return ("warn" if warns else "ok"), {"containers": rows}, warns


def last_record(path):
    last = None
    with open(path, "rb") as fh:
        for raw in fh:
            raw = raw.strip()
            if raw:
                last = raw
    if last is None:
        return None
    rec = json.loads(last[:4096])
    if not isinstance(rec, dict):
        raise ValueError("record is not an object")
    return rec


def check_deploy_records(containers):
    by_name = {c["name"]: c for c in containers}
    apps, warns = {}, []
    files = sorted(glob.glob(os.path.join(DEPLOY_DIR, "*.jsonl")))
    for path in files:
        app = os.path.basename(path)[:-6]
        try:
            rec = last_record(path)
        except (OSError, ValueError) as e:
            warns.append(f"{app}: unreadable deploy record ({type(e).__name__})")
            apps[app] = {"status": "unreadable"}
            continue
        if rec is None:
            apps[app] = {"status": "no_records"}
            continue
        ctr = short(rec.get("container", ""), 128)
        want = short(rec.get("image_id", ""), 80)
        c = by_name.get(ctr)
        info = {"container": ctr, "record_image": want, "record_result": short(rec.get("result", ""), 20),
                "record_ts": short(rec.get("ts", ""), 30), "run_id": short(rec.get("run_id", ""), 24)}
        if c is None:
            info["status"] = "container_missing"
            warns.append(f"{app}: container {ctr or '?'} from the last deploy record is not present")
        elif c.get("image") != want:
            info.update(status="mismatch", running_image=short(c.get("image"), 80))
            warns.append(f"{app}: running image {str(c.get('image'))[7:19]} != last deploy record {want[7:19]}")
        else:
            info["status"] = "match"
        if info.get("record_result") in ("failed",):
            warns.append(f"{app}: last deploy result was failed (run {info['run_id']})")
        apps[app] = info
    status = "warn" if warns else ("ok" if files else "info")
    return status, {"apps": apps, "dir": DEPLOY_DIR, "note": "" if files else "no deploy records yet"}, warns


def check_unattended_upgrades():
    """Last run time: systemd's apt-daily-upgrade.service exit time, else the log file's mtime."""
    last, source = None, None
    try:
        out = run(["systemctl", "show", "apt-daily-upgrade.service", "--property=ExecMainExitTimestamp",
                   "--timestamp=unix"])
        m = re.search(r"ExecMainExitTimestamp=@(\d+)", out)
        if m:
            last, source = dt.datetime.fromtimestamp(int(m.group(1)), dt.timezone.utc), "systemd"
    except CheckError:
        pass
    if last is None:
        try:
            last = dt.datetime.fromtimestamp(os.stat(UU_LOG).st_mtime, dt.timezone.utc)
            source = "log_mtime"
        except OSError:
            pass
    if last is None:
        return "warn", {"last_run": None}, ["unattended-upgrades: no evidence of any run"]
    age_h = (now() - last).total_seconds() / 3600
    warns = [f"unattended-upgrades last ran {age_h:.0f}h ago (> {UU_MAX_AGE_H}h)"] if age_h > UU_MAX_AGE_H else []
    return ("warn" if warns else "ok"), {"last_run": last.isoformat(), "age_hours": round(age_h, 1),
                                         "source": source}, warns


def check_reboot():
    if not os.path.exists(REBOOT_FILE):
        return "ok", {"reboot_required": False}, []
    pkgs = []
    try:
        with open(REBOOT_FILE + ".pkgs", encoding="utf-8", errors="replace") as fh:
            pkgs = sorted({short(l.strip(), 80) for l in fh if l.strip()})[:30]
    except OSError:
        pass
    return "warn", {"reboot_required": True, "packages": pkgs}, ["reboot required" + (f" ({', '.join(pkgs[:5])})" if pkgs else "")]


# ---------------- state, history, weekly ----------------

def write_json(path, obj):
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".tmp-")
    try:
        with os.fdopen(fd, "w") as fh:
            json.dump(obj, fh, indent=2, sort_keys=True)
            fh.write("\n")
        os.chmod(tmp, 0o644)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def prune_history(hist_dir, t):
    cutoff = t - dt.timedelta(days=HISTORY_DAYS)
    removed = 0
    for p in glob.glob(os.path.join(hist_dir, "*.json")):
        stamp = os.path.basename(p)[:-5]
        try:
            when = dt.datetime.strptime(stamp, "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
        except ValueError:
            continue  # not ours; leave it
        if when < cutoff:
            os.unlink(p)
            removed += 1
    return removed


def weekly(state, hist_dir, t):
    monday = (t - dt.timedelta(days=t.weekday())).date()
    path = os.path.join(STATE_DIR, f"weekly-{monday.isoformat()}.json")
    if os.path.exists(path):
        return None
    since = t - dt.timedelta(days=7)
    runs = [r for r in state.get("runs", []) if r.get("ts", "") >= since.strftime("%Y-%m-%dT%H:%M:%SZ")]
    warn_counts, worst = {}, {}
    rank = {"ok": 0, "info": 0, "warn": 1, "error": 2}
    for p in sorted(glob.glob(os.path.join(hist_dir, "*.json"))):
        try:
            when = dt.datetime.strptime(os.path.basename(p)[:-5], "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
        except ValueError:
            continue
        if when < since:
            continue
        rep = load_json(p, {})
        for w in rep.get("warnings", []):
            warn_counts[w] = warn_counts.get(w, 0) + 1
        for name, c in rep.get("checks", {}).items():
            s = c.get("status", "error")
            if rank.get(s, 2) >= rank.get(worst.get(name, "ok"), 0):
                worst[name] = s
    fails = [r for r in runs if not r.get("ok")]
    summary = {
        "type": "moose-hostcheck-weekly", "version": VERSION, "iso_week": f"{t.isocalendar()[0]}-W{t.isocalendar()[1]:02d}",
        "week_start": monday.isoformat(), "generated": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_start": since.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "self": {"runs_7d": len(runs), "fails_7d": len(fails), "runs_total": state.get("run_count", 0),
                 "fails_total": state.get("fail_count", 0), "last_error": state.get("last_error"),
                 "last_error_ts": state.get("last_error_ts"), "expected_runs_7d": 7,
                 "healthy": len(runs) >= 6 and not fails},
        "worst_status": worst,
        "warnings": [{"warning": w, "runs": n} for w, n in sorted(warn_counts.items(), key=lambda x: (-x[1], x[0]))][:100],
    }
    write_json(path, summary)
    return path


CHECKS = [("disk", check_disk), ("rollback_tags", check_rollback_tags), ("apt_security", check_apt_security),
          ("containers", None), ("deploy_records", None), ("unattended_upgrades", check_unattended_upgrades),
          ("reboot", check_reboot)]


def main():
    t = now().astimezone(dt.timezone.utc).replace(microsecond=0)
    hist_dir = os.path.join(STATE_DIR, "history")
    os.makedirs(hist_dir, mode=0o755, exist_ok=True)
    state = load_json(os.path.join(STATE_DIR, "state.json"), {})
    checks, warnings, errors = {}, [], []
    containers = None
    for name, fn in CHECKS:
        try:
            if name in ("containers", "deploy_records"):
                if containers is None:
                    containers = inspect_containers()
                status, details, warns = (check_containers(containers) if name == "containers"
                                          else check_deploy_records(containers))
            else:
                status, details, warns = fn()
        except CheckError as e:
            status, details, warns = "error", {"error": short(e, 300)}, []
            errors.append(f"{name}: {short(e, 300)}")
        except Exception as e:  # a bug in one check must not hide the others
            status, details, warns = "error", {"error": f"{type(e).__name__}: {short(e, 200)}"}, []
            errors.append(f"{name}: crashed ({type(e).__name__})")
        checks[name] = {"status": status, **details}
        warnings.extend(warns)
    ok = not errors
    ts = t.strftime("%Y-%m-%dT%H:%M:%SZ")
    report = {"type": "moose-hostcheck", "version": VERSION, "ts": ts, "host": short(os.uname().nodename, 64),
              "ok": ok, "status": "error" if errors else ("warn" if warnings else "ok"),
              "errors": errors, "warnings": warnings, "checks": checks}
    write_json(os.path.join(hist_dir, t.strftime("%Y%m%dT%H%M%SZ") + ".json"), report)
    write_json(os.path.join(STATE_DIR, "latest.json"), report)
    state["run_count"] = int(state.get("run_count", 0)) + 1
    state["runs"] = ([r for r in state.get("runs", []) if r.get("ts", "") >= (t - dt.timedelta(days=HISTORY_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")]
                     + [{"ts": ts, "ok": ok, "warnings": len(warnings)}])
    state["last_run"] = ts
    if not ok:
        state["fail_count"] = int(state.get("fail_count", 0)) + 1
        state["last_error"] = "; ".join(errors)[:500]
        state["last_error_ts"] = ts
    state.setdefault("fail_count", 0)
    write_json(os.path.join(STATE_DIR, "state.json"), state)
    prune_history(hist_dir, t)
    weekly(state, hist_dir, t)
    print(f"moose-hostcheck {ts}: status={report['status']} warnings={len(warnings)} errors={len(errors)}")
    return 0 if ok else 1


def crash_record(exc):
    """Last resort: count the failure even if main() died before writing state."""
    try:
        p = os.path.join(STATE_DIR, "state.json")
        state = load_json(p, {})
        ts = now().strftime("%Y-%m-%dT%H:%M:%SZ")
        state["run_count"] = int(state.get("run_count", 0)) + 1
        state["fail_count"] = int(state.get("fail_count", 0)) + 1
        state["last_error"] = f"crash: {type(exc).__name__}: {short(exc, 200)}"
        state["last_error_ts"] = ts
        state.setdefault("runs", []).append({"ts": ts, "ok": False, "warnings": 0})
        write_json(p, state)
    except Exception:
        pass


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        crash_record(exc)
        sys.exit(1)
