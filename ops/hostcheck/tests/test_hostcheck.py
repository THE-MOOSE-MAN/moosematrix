"""Unit tests for moose_hostcheck.py with fixture outputs (no docker, no apt, no network)."""
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "moose_hostcheck.py")
IMG_A = "sha256:" + "a" * 64
IMG_B = "sha256:" + "b" * 64

DF_OK = """Filesystem     Type     1024-blocks      Used Available Capacity Mounted on
/dev/sda1      ext4        81000000  15000000  66000000      19% /
tmpfs          tmpfs         400000         0    400000       0% /run
overlay        overlay     81000000  15000000  66000000      19% /var/lib/docker/overlay2/x/merged
/dev/sdb1      xfs         10000000   8100000   1900000      81% /srv/data dir
"""
APT = """Listing...
libnss3/noble-updates,noble-security 2:3.98-1ubuntu0.4 amd64 [upgradable from: 2:3.98-1ubuntu0.3]
vim/noble-updates 2:9.1.0016-1ubuntu7.9 amd64 [upgradable from: 2:9.1.0016-1ubuntu7.8]
openssl/noble-security 3.0.13-0ubuntu3.7 amd64 [upgradable from: 3.0.13-0ubuntu3.6]
"""
IMAGES = """moosematrix:rollback-2026-10-21-r36
moosematrix:rollback-2026-10-21-r38
moosematrix:rollback-20261020-aaaaaaa
moosematrix:rollback-20261021-bbbbbbb
ghcr.io/the-moose-man/moosematrix:prod-latest
moose-money-prod:rollback-20261001-1111111
moose-money-prod:rollback-20261002-2222222
moose-money-prod:rollback-20261003-3333333
moose-money-prod:rollback-20261004-4444444
"""


def inspect_line(name, image, status="running", health="healthy", restarting=False, rc=0):
    return json.dumps({"name": "/" + name, "image": image, "status": status, "restarting": restarting,
                       "restart_count": rc, "health": health})


class HostcheckTest(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp()
        self.fix = os.path.join(self.t, "fix"); os.makedirs(self.fix)
        self.state = os.path.join(self.t, "state")
        self.deploys = os.path.join(self.t, "deploys"); os.makedirs(self.deploys)
        self.uu = os.path.join(self.t, "uu.log")
        self.reboot = os.path.join(self.t, "reboot-required")
        self.now = "2026-10-26T06:17:00+00:00"  # a Monday
        self.put("df", DF_OK.replace("81% /srv/data dir", "50% /srv/data dir"))
        self.put("apt", "Listing...\n")
        self.put("docker_images", IMAGES.replace("moose-money-prod:rollback-20261004-4444444\n", ""))
        self.put("docker_ps", "c1\nc2\n")
        self.put("docker_inspect", inspect_line("moosematrix-app-prod", IMG_A) + "\n" + inspect_line("m2-app-prod", IMG_B) + "\n")
        self.put("systemctl", "ExecMainExitTimestamp=@%d\n" % int(dt.datetime(2026, 10, 26, 2, 0, tzinfo=dt.timezone.utc).timestamp()))
        self.record("moosematrix", "moosematrix-app-prod", IMG_A)

    def tearDown(self):
        shutil.rmtree(self.t)

    def put(self, name, text):
        with open(os.path.join(self.fix, name + ".out"), "w") as fh:
            fh.write(text)

    def fail_cmd(self, name, rc=1):
        with open(os.path.join(self.fix, name + ".rc"), "w") as fh:
            fh.write(str(rc))

    def record(self, app, ctr, img, result="deployed", extra_lines=()):
        with open(os.path.join(self.deploys, app + ".jsonl"), "a") as fh:
            for l in extra_lines:
                fh.write(l + "\n")
            fh.write(json.dumps({"ts": "2026-10-25T10:00:00Z", "app": app, "container": ctr, "image_id": img,
                                 "result": result, "run_id": "1"}) + "\n")

    def run_hc(self, now=None):
        env = dict(os.environ, PATH=os.path.join(HERE, "fakebin") + ":/usr/bin:/bin", FIX=self.fix,
                   MOOSE_HC_STATE_DIR=self.state, MOOSE_HC_DEPLOY_DIR=self.deploys, MOOSE_HC_UU_LOG=self.uu,
                   MOOSE_HC_REBOOT_FILE=self.reboot, MOOSE_HC_NOW=now or self.now)
        os.makedirs(self.state, exist_ok=True)
        p = subprocess.run([sys.executable, SCRIPT], env=env, capture_output=True, text=True)
        lp = os.path.join(self.state, "latest.json")
        latest = None
        if os.path.exists(lp):
            with open(lp) as fh:
                latest = json.load(fh)
        return p, latest

    # ---- happy path ----
    def test_all_ok(self):
        p, r = self.run_hc()
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(r["status"], "ok", r["warnings"])
        self.assertEqual(r["checks"]["deploy_records"]["apps"]["moosematrix"]["status"], "match")
        self.assertEqual(r["checks"]["rollback_tags"]["apps"]["moosematrix"], {"auto": 2, "manual": 2})
        mounts = [m["mount"] for m in r["checks"]["disk"]["mounts"]]
        self.assertEqual(mounts, ["/", "/srv/data dir"])  # tmpfs/overlay skipped, spaces kept

    # ---- warnings (exit 0) ----
    def test_disk_over_80_warns_80_does_not(self):
        self.put("df", DF_OK)
        p, r = self.run_hc()
        self.assertEqual(p.returncode, 0)
        self.assertTrue(any("81%" in w for w in r["warnings"]))
        self.put("df", DF_OK.replace("81% /srv", "80% /srv"))
        p, r = self.run_hc("2026-10-26T07:00:00+00:00")
        self.assertFalse(any("disk" in w for w in r["warnings"]))

    def test_apt_security_only(self):
        self.put("apt", APT)
        p, r = self.run_hc()
        names = [x["name"] for x in r["checks"]["apt_security"]["packages"]]
        self.assertEqual(names, ["libnss3", "openssl"])
        self.assertEqual(p.returncode, 0)

    def test_rollback_tag_overflow(self):
        self.put("docker_images", IMAGES)
        p, r = self.run_hc()
        self.assertEqual(r["checks"]["rollback_tags"]["apps"]["moose-money-prod"]["auto"], 4)
        self.assertTrue(any("moose-money-prod: 4 auto" in w for w in r["warnings"]))

    def test_unhealthy_restarting_and_restart_count(self):
        self.put("docker_inspect", "\n".join([
            inspect_line("moosematrix-app-prod", IMG_A, health="unhealthy"),
            inspect_line("loop", IMG_B, status="restarting", restarting=True),
            inspect_line("flappy", IMG_B, rc=3),
            inspect_line("mooseman-app-prod", IMG_B, status="exited", health=""),
        ]) + "\n")
        p, r = self.run_hc()
        w = " | ".join(r["warnings"])
        self.assertIn("moosematrix-app-prod is unhealthy", w)
        self.assertIn("loop is restarting", w)
        self.assertIn("flappy restarted 3", w)
        self.assertNotIn("mooseman-app-prod", w)  # intentionally stopped service is not a warning

    def test_image_mismatch_missing_and_failed(self):
        self.record("moose-money-prod", "m2-app-prod", IMG_A)        # running IMG_B
        self.record("moosebrain-api", "moosebrain-api-prod", IMG_A)  # container absent
        self.record("mooseman-site-prod", "mooseman-app-prod", IMG_A, result="failed")
        p, r = self.run_hc()
        apps = r["checks"]["deploy_records"]["apps"]
        self.assertEqual(apps["moose-money-prod"]["status"], "mismatch")
        self.assertEqual(apps["moosebrain-api"]["status"], "container_missing")
        self.assertTrue(any("last deploy result was failed" in w for w in r["warnings"]))
        self.assertEqual(p.returncode, 0)

    def test_uses_last_line_and_tolerates_garbage(self):
        self.record("moosematrix", "moosematrix-app-prod", IMG_B)  # later line wins -> mismatch
        p, r = self.run_hc()
        self.assertEqual(r["checks"]["deploy_records"]["apps"]["moosematrix"]["status"], "mismatch")
        with open(os.path.join(self.deploys, "broken.jsonl"), "w") as fh:
            fh.write('{"not json\n')
        p, r = self.run_hc("2026-10-26T07:00:00+00:00")
        self.assertEqual(p.returncode, 0)
        self.assertEqual(r["checks"]["deploy_records"]["apps"]["broken"]["status"], "unreadable")

    def test_hostile_record_values_stay_data(self):
        evil = '","ok":true,"x":"' + "A" * 1000
        with open(os.path.join(self.deploys, "evil.jsonl"), "w") as fh:
            fh.write(json.dumps({"container": evil, "image_id": evil, "result": evil}) + "\n")
        with open(os.path.join(self.deploys, "huge.jsonl"), "w") as fh:  # > 4 KiB line is rejected
            fh.write(json.dumps({"container": "A" * 9000}) + "\n")
        p, r = self.run_hc()
        self.assertEqual(p.returncode, 0)
        e = r["checks"]["deploy_records"]["apps"]["evil"]
        self.assertLessEqual(len(e["container"]), 128)
        self.assertEqual(r["checks"]["deploy_records"]["apps"]["huge"]["status"], "unreadable")
        self.assertNotIn("x", r)  # nothing injected at top level
        json.load(open(os.path.join(self.state, "latest.json")))

    def test_unattended_upgrades_stale_and_log_fallback(self):
        old = int(dt.datetime(2026, 10, 23, 0, 0, tzinfo=dt.timezone.utc).timestamp())
        self.put("systemctl", "ExecMainExitTimestamp=@%d\n" % old)
        p, r = self.run_hc()
        self.assertTrue(any("unattended-upgrades last ran" in w for w in r["warnings"]))
        self.put("systemctl", "ExecMainExitTimestamp=\n")  # never ran per systemd -> log mtime
        open(self.uu, "w").close()
        t = dt.datetime(2026, 10, 26, 1, 0, tzinfo=dt.timezone.utc).timestamp()
        os.utime(self.uu, (t, t))
        p, r = self.run_hc("2026-10-26T07:00:00+00:00")
        self.assertEqual(r["checks"]["unattended_upgrades"]["source"], "log_mtime")
        self.assertEqual(r["checks"]["unattended_upgrades"]["status"], "ok")

    def test_reboot_required(self):
        open(self.reboot, "w").close()
        with open(self.reboot + ".pkgs", "w") as fh:
            fh.write("linux-image-6.8.0-87-generic\nlibc6\n")
        p, r = self.run_hc()
        self.assertTrue(r["checks"]["reboot"]["reboot_required"])
        self.assertIn("libc6", r["checks"]["reboot"]["packages"])
        self.assertEqual(p.returncode, 0)

    # ---- script failures (exit 1) ----
    def test_docker_down_is_a_failure_but_other_checks_still_run(self):
        self.fail_cmd("docker_images"); self.fail_cmd("docker_ps")
        p, r = self.run_hc()
        self.assertEqual(p.returncode, 1)
        self.assertEqual(r["status"], "error")
        self.assertEqual(r["checks"]["disk"]["status"], "ok")
        st = json.load(open(os.path.join(self.state, "state.json")))
        self.assertEqual(st["fail_count"], 1)
        self.assertIn("rollback_tags", st["last_error"])

    def test_crash_still_counts(self):
        os.makedirs(self.state, exist_ok=True)
        with open(os.path.join(self.state, "history"), "w") as fh:  # history path is a file -> makedirs fails
            fh.write("x")
        p, _ = self.run_hc()
        self.assertEqual(p.returncode, 1)
        st = json.load(open(os.path.join(self.state, "state.json")))
        self.assertEqual((st["run_count"], st["fail_count"]), (1, 1))
        self.assertTrue(st["last_error"].startswith("crash:"))

    # ---- history + weekly ----
    def test_history_pruned_after_14_days_and_foreign_files_kept(self):
        hist = os.path.join(self.state, "history"); os.makedirs(hist)
        for name in ("20261011T061700Z.json", "20261013T061700Z.json", "notes.json"):
            open(os.path.join(hist, name), "w").write("{}")
        self.run_hc()
        left = sorted(os.listdir(hist))
        self.assertNotIn("20261011T061700Z.json", left)
        self.assertIn("20261013T061700Z.json", left)
        self.assertIn("notes.json", left)
        self.assertIn("20261026T061700Z.json", left)

    def test_weekly_written_once_per_iso_week_with_self_stats(self):
        # Tue..Sun of the previous week, one failing run, then Monday
        days = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]
        for d in days:
            if d == "2026-10-22":
                self.fail_cmd("docker_ps")
            p, _ = self.run_hc(d + "T06:17:00+00:00")
            if d == "2026-10-22":
                os.unlink(os.path.join(self.fix, "docker_ps.rc"))
        self.assertTrue(os.path.exists(os.path.join(self.state, "weekly-2026-10-19.json")))  # missing -> written mid-week
        self.run_hc("2026-10-26T06:17:00+00:00")  # Monday
        wk = json.load(open(os.path.join(self.state, "weekly-2026-10-26.json")))
        self.assertEqual(wk["iso_week"], "2026-W44")
        self.assertEqual(wk["self"]["runs_7d"], 7)
        self.assertEqual(wk["self"]["fails_7d"], 1)
        self.assertIn("containers", wk["self"]["last_error"])
        self.assertFalse(wk["self"]["healthy"])
        self.assertEqual(wk["worst_status"]["containers"], "error")
        before = os.path.getmtime(os.path.join(self.state, "weekly-2026-10-26.json"))
        self.run_hc("2026-10-27T06:17:00+00:00")  # Tuesday: already exists -> untouched
        self.assertEqual(before, os.path.getmtime(os.path.join(self.state, "weekly-2026-10-26.json")))

    def test_output_files_are_0644(self):
        self.run_hc()
        for f in ("latest.json", "state.json", "weekly-2026-10-26.json"):
            self.assertEqual(oct(os.stat(os.path.join(self.state, f)).st_mode & 0o777), "0o644", f)


if __name__ == "__main__":
    unittest.main(verbosity=2)
