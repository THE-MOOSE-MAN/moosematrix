# Deploy safety (moosematrix prod + dev)

## How a deploy runs on the VPS

The deploy job streams `scripts/deploy-safe.sh` plus the remote body over one SSH session
(`{ cat scripts/deploy-safe.sh; cat <<EOF … EOF; } | ssh … bash -s`). Nothing is installed on the host.

1. **Lock.** `ds_lock` takes `/run/lock/moose-deploy.lock` (flock, waits up to 600 s). Every deploy on the VPS
   (moosematrix prod/dev, moose-brain, moose_money, mooseman-site) shares this lock, so two deploys never tag,
   pin or recreate containers at the same time. GitHub-side, the deploy job's `concurrency` group has
   `cancel-in-progress: false`, so a running deploy is never cancelled by a newer push.
2. **Rollback tag.** `ds_pre` tags the running image `<app>:rollback-YYYYMMDD-<sha7>` and keeps the newest 3.
3. **Pull / migrate / up** (repo specific).
4. **Verify.** `ds_finish` requires healthy + `org.opencontainers.image.revision == GITHUB_SHA`; otherwise it
   re-points the old ref at the rollback tag, recreates only this service, records `rolled_back` and fails the job.
5. **Record + prune.** One JSON line in `/var/lib/moose-deploys/<app>.jsonl`; dangling-only prune.

### Rule: the remote body runs inside `main() { …; }; main </dev/null; exit $?`

`bash -s` reads its script from stdin as it goes. Any child that reads stdin (`docker compose run`, which keeps
stdin attached by default, or `docker compose exec`) would eat the rest of the script, and bash would exit 0
with the verify/rollback/record steps silently skipped (Vulnerability Bot R39 H1; it happened on moose-brain).
Wrapping the body in a function makes bash parse all of it before anything runs, and `</dev/null` gives every
child an empty stdin. Keep new remote commands inside `main`.

## Pre-merge step for Dustin: add the `VPS_KNOWN_HOSTS` repo secret

The deploy now pins the VPS host key from a secret (`StrictHostKeyChecking=yes`) instead of
`StrictHostKeyChecking=no` / trusting `ssh-keyscan` on every run. **Until the secret exists the deploy job stops
at "Pin VPS host key" with a clear error; nothing reaches the VPS.** Adding it is a GitHub settings change.

1. Get the keys from the host itself (not over the network), on the VPS:
   ```
   for f in /etc/ssh/ssh_host_*_key.pub; do echo "[<HOST>]:<PORT> $(cut -d' ' -f1,2 "$f")"; done
   ```
   `<HOST>` and `<PORT>` must be exactly the values this repo's workflow connects to (see the table below). If the
   port is 22, write the bare host instead of `[<HOST>]:22`.
2. Repo → Settings → Secrets and variables → Actions → New repository secret: name `VPS_KNOWN_HOSTS`, value = those
   lines. (`gh secret set VPS_KNOWN_HOSTS -R THE-MOOSE-MAN/<repo> < known_hosts.txt` does the same.)
3. Rollback: delete the secret and revert the workflow change.

moose_money and mooseman-site already use this pattern with their own `VPS_KNOWN_HOSTS`.

| Workflow | Host secret | Port secret |
|---|---|---|
| `.github/workflows/prod.yml`, `dev.yml` | `VPS_HOST` | `VPS_PORT` |

## Rollback

Automatic on a failed verify. By hand (on the VPS, in `/home/moose/projects/infra`):
`docker tag moosematrix:rollback-YYYYMMDD-xxxxxxx ghcr.io/the-moose-man/moosematrix:prod-latest && docker compose up -d --no-deps --force-recreate moosematrix-app-prod`
