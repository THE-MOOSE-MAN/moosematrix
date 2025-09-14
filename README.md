# Moose Matrix Monorepo (Starter)

This is a Turborepo starter containing:
- `apps/moosematrix` → main landing page (Next.js App Router)
- `packages/ui` → shared UI components + Tailwind tokens

## Quickstart

```bash
# 1) Install Node 20+ and Git
# 2) Install Turbo globally (optional)
npm i -g turbo

# 3) Install repo deps
npm install

# 4) Install package deps
cd packages/ui && npm install
cd ../../apps/moosematrix && npm install
cd ../../

# 5) Run the landing app
npm run dev
# Then open http://localhost:3000
```

### Subdomain links
The landing has links to:
- `https://mooseman.moosematrix.com`
- `https://store.moosematrix.com`
- `https://omnivium.moosematrix.com`

Update as you bring each app online.

## Creating the GitHub repo

```bash
# Initialize git
git init
git add .
git commit -m "feat: initial monorepo (moosematrix + ui)"

# Create repo with GitHub CLI (replace ORG/REPO as you like)
gh repo create moosematrix --public --source=. --remote=origin --push
# If you don't use gh:
# 1) Create an empty repo on GitHub
# 2) Then:
# git remote add origin https://github.com/<your-username>/moosematrix.git
# git push -u origin main
```

## Deploy later
- VPS (Ubuntu 24.04) with Nginx + PM2
- Let's Encrypt (Certbot) for SSL
- GitHub Actions → SSH deploy

See the project plan for details.
