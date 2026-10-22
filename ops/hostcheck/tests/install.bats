#!/usr/bin/env bats
# install.sh / uninstall.sh into a fake root with fake useradd/systemctl/chown (nothing touches the real system).
D="$BATS_TEST_DIRNAME/.."
setup() {
  export MOOSE_ROOT="$BATS_TEST_TMPDIR/root" FAKE_LOG="$BATS_TEST_TMPDIR/log" FAKE_USERS="$BATS_TEST_TMPDIR/users"
  mkdir -p "$MOOSE_ROOT" "$FAKE_USERS"; : > "$FAKE_LOG"
  export PATH="$BATS_TEST_DIRNAME/fakeroot-bin:$PATH"
}
snapshot() { (cd "$MOOSE_ROOT" && find . -printf '%p %m\n' | sort; find . -type f -exec sha256sum {} + | sort); }

@test "timer install creates user, script, units, enables timer" {
  run "$D/install.sh"
  [ "$status" -eq 0 ]
  [ -x "$MOOSE_ROOT/usr/local/lib/moose-hostcheck/moose_hostcheck.py" ]
  [ "$(stat -c %a "$MOOSE_ROOT/etc/systemd/system/moose-hostcheck.service")" = 644 ]
  grep -q '^useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin moose-hostcheck$' "$FAKE_LOG"
  grep -q '^usermod -aG docker moose-hostcheck$' "$FAKE_LOG"
  grep -q '^systemctl enable --now moose-hostcheck.timer$' "$FAKE_LOG"
  [ ! -e "$MOOSE_ROOT/var/lib/moose-deploys" ]   # only with --prepare-deploy-records
}

@test "install is idempotent: second run converges, no second useradd/usermod" {
  "$D/install.sh"; a="$(snapshot)"; : > "$FAKE_LOG"
  "$D/install.sh"; b="$(snapshot)"
  [ "$a" = "$b" ]
  ! grep -q '^useradd' "$FAKE_LOG"
  ! grep -q '^usermod' "$FAKE_LOG"
}

@test "--prepare-deploy-records: root dir 0755, per-app files 0644 owned by the deploy user, existing content kept" {
  mkdir -p "$MOOSE_ROOT/var/lib/moose-deploys"; echo '{"keep":1}' > "$MOOSE_ROOT/var/lib/moose-deploys/moosematrix.jsonl"
  DEPLOY_APPS="moosematrix moose-money-prod" run "$D/install.sh" --prepare-deploy-records
  [ "$status" -eq 0 ]
  [ "$(stat -c %a "$MOOSE_ROOT/var/lib/moose-deploys")" = 755 ]
  [ "$(stat -c %a "$MOOSE_ROOT/var/lib/moose-deploys/moose-money-prod.jsonl")" = 644 ]
  grep -q keep "$MOOSE_ROOT/var/lib/moose-deploys/moosematrix.jsonl"
  grep -q '^chown root:root .*/var/lib/moose-deploys$' "$FAKE_LOG"
  grep -q '^chown moose:moose .*/moose-money-prod.jsonl$' "$FAKE_LOG"
}

@test "bad app or deploy user names are rejected" {
  DEPLOY_APPS="../../etc/passwd" run "$D/install.sh" --prepare-deploy-records
  [ "$status" -eq 64 ]
  DEPLOY_USER='root;id' run "$D/install.sh"
  [ "$status" -eq 64 ]
}

@test "--cron is not supported (timer only, VB R39 M4): rejected, nothing installed" {
  run "$D/install.sh" --cron
  [ "$status" -eq 64 ]
  [ -z "$(ls -A "$MOOSE_ROOT")" ]
  [ ! -e "$MOOSE_ROOT/etc/cron.d" ]
}

@test "--run-now starts the sandboxed service (never runs the script outside systemd)" {
  run "$D/install.sh" --run-now
  [ "$status" -eq 0 ]
  grep -q '^systemctl start moose-hostcheck.service$' "$FAKE_LOG"
  ! grep -q '^runuser' "$FAKE_LOG"
}

@test "service unit: syscall filter fails with EPERM, setrlimit re-allowed after the @resources deny" {
  u="$D/systemd/moose-hostcheck.service"
  grep -qx 'SystemCallErrorNumber=EPERM' "$u"
  [ "$(grep -n '^SystemCallFilter=~@privileged @resources$' "$u" | cut -d: -f1)" -lt "$(grep -n '^SystemCallFilter=setrlimit$' "$u" | cut -d: -f1)" ]
}

@test "--dry-run changes nothing" {
  run "$D/install.sh" --dry-run --prepare-deploy-records
  [ "$status" -eq 0 ]
  [ -z "$(ls -A "$MOOSE_ROOT")" ]
  [ ! -s "$FAKE_LOG" ]
}

@test "uninstall removes everything but reports and deploy records; --purge removes reports; idempotent" {
  "$D/install.sh" --prepare-deploy-records
  mkdir -p "$MOOSE_ROOT/var/lib/moose-hostcheck"; echo '{}' > "$MOOSE_ROOT/var/lib/moose-hostcheck/latest.json"
  run "$D/uninstall.sh"
  [ "$status" -eq 0 ]
  [ ! -e "$MOOSE_ROOT/usr/local/lib/moose-hostcheck" ]
  [ ! -e "$MOOSE_ROOT/etc/systemd/system/moose-hostcheck.timer" ]
  [ -f "$MOOSE_ROOT/var/lib/moose-hostcheck/latest.json" ]
  [ -d "$MOOSE_ROOT/var/lib/moose-deploys" ]
  grep -q '^userdel moose-hostcheck$' "$FAKE_LOG"
  run "$D/uninstall.sh" --purge
  [ "$status" -eq 0 ]
  [ ! -e "$MOOSE_ROOT/var/lib/moose-hostcheck" ]
  [ -d "$MOOSE_ROOT/var/lib/moose-deploys" ]
  run "$D/uninstall.sh"
  [ "$status" -eq 0 ]
}

@test "real install refuses to run as non-root" {
  [ "$(id -u)" -ne 0 ] || skip "running as root"
  MOOSE_ROOT= run "$D/install.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"run as root"* ]]
}
