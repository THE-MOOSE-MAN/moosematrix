# moose-hostcheck

Daily, read-only health check for the VPS. It uses no tokens and makes no network calls. Vulnerability Bot reads one file
a week (`weekly-<date>.json`) instead of spending its own tokens on these checks.

## What it checks

| Check | Warns when |
|---|---|
| `disk` | any real filesystem (tmpfs/overlay/squashfs skipped) is **over 80%** used |
| `rollback_tags` | an app has more than 3 auto `rollback-YYYYMMDD-<sha>` tags (retention in `scripts/deploy-safe.sh` not working). Manual tags are counted separately and never warned |
| `apt_security` | `apt list --upgradable` shows packages from a `*-security` pocket (local apt cache only; no `apt update`) |
| `containers` | a container is unhealthy, restarting, or running with restart count > 0 (stopped containers, e.g. mooseman, are listed but not warned) |
| `deploy_records` | the running image for a container differs from the last line of `/var/lib/moose-deploys/<app>.jsonl`, the container is missing, or the last deploy result was `failed` |
| `unattended_upgrades` | `apt-daily-upgrade.service` (else the unattended-upgrades log mtime) shows no run in **48 h** |
| `reboot` | `/var/run/reboot-required` exists (lists `reboot-required.pkgs`) |

## Output (`/var/lib/moose-hostcheck`, dir 0755, files 0644)

- `latest.json`: the last run (`status` ok|warn|error, `warnings[]`, `errors[]`, per-check details).
- `history/<YYYYMMDDTHHMMSSZ>.json`: one per run, pruned after 14 days. Files not in that name format are left alone.
- `state.json`: `run_count`, `fail_count`, `last_error`, `last_error_ts`, and runs from the last 14 days.
- `weekly-<Monday of ISO week>.json`: written by the first run of each ISO week (normally Monday). Covers the previous
  7 days: worst status per check, warnings with how many runs saw them, and the script's own health
  (`self.runs_7d`, `fails_7d`, `last_error`, `healthy` = at least 6 runs and no failures).

Exit code: `0` = the check ran (warnings are not failures); `1` = the script failed (a check could not run, e.g.
docker unreachable, or a crash). Failures are counted in `state.json` either way.

## Install (needs Dustin's approval: host change)

```bash
sudo ops/hostcheck/install.sh --prepare-deploy-records --run-now   # systemd timer, daily 06:17 UTC ±10 min
sudo ops/hostcheck/install.sh --cron                               # alternative: /etc/cron.d, no sandbox
sudo ops/hostcheck/install.sh --dry-run --prepare-deploy-records   # show what would change
```

`install.sh` is idempotent. `--prepare-deploy-records` creates `/var/lib/moose-deploys` as root:root 0755, plus one
`<app>.jsonl` per app (0644, owned by `$DEPLOY_USER`, default `moose`). Non-root CI deploys can then append to their
own file but cannot create, rename or delete files in the directory. Root deploys create the files themselves.

**Rollback:** `sudo ops/hostcheck/uninstall.sh` removes the timer or cron entry, the units, the script and the user.
Reports stay unless you add `--purge`, and `/var/lib/moose-deploys` is never touched.

## Privilege tradeoff

The check needs to read the Docker socket. Membership of the `docker` group is **root-equivalent**, because anyone
who can talk to the socket can start a privileged container. Options considered:

1. Root oneshot: simplest, but every bug runs as root.
2. **Chosen:** a dedicated system user `moose-hostcheck` (no shell, no home) with `SupplementaryGroups=docker`, plus a
   systemd sandbox: no capabilities, `NoNewPrivileges`, `ProtectSystem=strict` with only `/var/lib/moose-hostcheck`
   writable, `ProtectHome`, `PrivateTmp`, `PrivateDevices`, `PrivateNetwork` + `IPAddressDeny=any`, AF_UNIX only,
   and a syscall filter. A bug in the script can't write files, reach the network or gain capabilities. The remaining
   risk is the Docker socket itself, which is the same as for any docker-group user.
3. Later, if wanted: a read-only Docker socket proxy (GET-only on `/containers/json`, `/images/json`) would remove
   the root-equivalence. It adds a new container and image to maintain, so it was left out of this change.

The script only runs `df`, `apt list --upgradable`, `systemctl show`, `docker image ls`, `docker ps` and
`docker inspect`. Nothing in it changes host state.

## Threat model (4 questions)

1. **What are we building?** A root-owned Python script, run daily by systemd as a non-root, docker-group user. It reads
   host state and the CI deploy records and writes JSON reports that Vulnerability Bot reads over SSH.
2. **What can go wrong?**
   - Docker group = root-equivalent, so a compromised script file means root. The script is root-owned 0755 in
     `/usr/local/lib`, so only root can change it.
   - Spoofed or hostile deploy records. A CI deploy user can write its own `<app>.jsonl`. It could hide a mismatch by
     writing the image id that is really running, or inject text into the report.
   - Report tampering. Only `moose-hostcheck` and root can write `/var/lib/moose-hostcheck`.
   - Silent death: the timer stops and nobody notices.
   - Resource abuse from huge record or history files.
3. **What do we do about it?**
   - Records are parsed with `json.loads`. Lines over 4 KiB are rejected, and every string is length-capped and
     written back out through `json.dump`, so no injection is possible.
   - The record check is a drift detector, not a security boundary. Anyone who can write a deploy record (the CI
     deploy user) is already in the docker group, which is root-equivalent, so a forged record adds no new power.
     What it catches is honest drift: a manual `docker run`, a failed deploy, or a container recreated from another
     image. The running image id always comes from Docker, never from the record.
   - The weekly file reports the script's own run and fail counts, and Vulnerability Bot alerts when it's missing
     or stale.
   - History is pruned after 14 days. Every command has a 60 s timeout. The service has a 5 min timeout and runs at
     idle IO priority.
4. **Did we do a good job?** There are unit tests with fixtures for every check, warning and failure path, plus
   hostile records, weekly roll-up, pruning and file modes (`tests/test_hostcheck.py`). There are also install and
   uninstall idempotency tests in a fake root (`tests/install.bats`), `systemd-analyze verify` on the units, and
   shellcheck on all shell. Vulnerability Bot reviews before install.

## Tests

```bash
python3 ops/hostcheck/tests/test_hostcheck.py
bats ops/hostcheck/tests/install.bats
```
