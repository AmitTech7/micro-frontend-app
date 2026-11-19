# CI/CD Setup Guide (GitHub Actions + Vercel)

Goal: every PR is checked automatically (CI), and deploys are done by GitHub Actions (CD).
We go slowly: first CI, then a **preview-only** deploy, and only at the end the production deploy.
Vercel's own Git deploys stay ON until the very last step, so your live site is never at risk.

Words used:
- **CI**: automatic checks on every PR (install, typecheck, build).
- **CD**: automatic deploy after merge.
- **Workflow**: a YAML file in `.github/workflows/` that GitHub runs.
- **Secret**: a hidden value (token) stored in GitHub, used by workflows.

---

## Step 0: Before you start (2 minutes)

1. Make sure the project is pushed to GitHub and `main` is up to date:
   ```bash
   git status
   git add .
   git commit -m "latest changes"
   git push
   ```
2. Make sure `pnpm-lock.yaml` is tracked by git: `git ls-files pnpm-lock.yaml` should print the file name.
   If it prints nothing, run `git add pnpm-lock.yaml` and commit it. CI needs it.

---

## Step 1: Create a new branch

```bash
git checkout -b ci-cd-setup
```

All workflow files are added on this branch. Nothing touches `main` until you merge.

---

## Step 2: Add the CI workflow

1. Create the folder and file: `.github/workflows/ci.yml` (the folder name must be exactly this).
2. Paste:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: pnpm/action-setup@v4        # reads "packageManager" from package.json

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm -r build
```

What each part means:
| Line | Meaning |
|---|---|
| `on: pull_request` | Run on every PR |
| `on: push: branches: [main]` | Also run after a merge into main |
| `runs-on: ubuntu-latest` | GitHub gives a fresh Linux machine |
| `checkout` | Download your code onto that machine |
| `pnpm/action-setup` | Install pnpm (version taken from `packageManager`) |
| `setup-node` + `cache: pnpm` | Install Node, remember downloaded packages for speed |
| `--frozen-lockfile` | Fail if the lockfile is out of date |
| `pnpm typecheck` | Type errors fail the build |
| `pnpm -r build` | Build host, products and cart |

3. Commit and push the branch:
   ```bash
   git add .github
   git commit -m "add CI workflow"
   git push -u origin ci-cd-setup
   ```

---

## Step 3: Open a PR and watch CI run

1. On GitHub, click **Compare & pull request** (appears after the push). Base = `main`, compare = `ci-cd-setup`. Create the PR.
2. Scroll down to the checks box, or open the **Actions** tab. You should see **CI / check** running, then a green tick.
3. If it fails, open the run, click the red step, read the log, fix, push again. The PR re-runs by itself.

**Do not merge yet.**

---

## Step 4: Make CI mandatory (branch rule for `main`)

Do this **after** CI has run once. GitHub only lists a check in the rule after it has run at least once.

1. GitHub repo, **Settings**, **Branches** (or **Rules**, then **Rulesets**).
2. **Add branch protection rule** (or **New ruleset**). Branch name pattern: `main`.
3. Turn on:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging**, then search for **check** and select it
   - (optional) **Require branches to be up to date before merging**
4. Save.

Result: nobody (including you) can push straight to `main`, and a PR with a red check cannot be merged.

If you use the new "Rulesets", the same options exist under "Require a pull request" and "Require status checks to pass".

---

## Step 5: Merge the CI PR

Back on the PR, with the check green, click **Merge pull request**.
`main` now has the CI workflow. From now on every PR gets checked.

Pull it locally:
```bash
git checkout main
git pull
```

---

## Step 6: Test that CI really blocks bad code

1. `git checkout -b test-bad-code`
2. Break something on purpose, for example in `products/src/mount.tsx` change `page = "list"` to `page: number = "list"` or add `const x: number = "hello";`
3. Commit, push, open a PR.
4. CI should go **red** and the merge button should be blocked.
5. Revert the mistake, push, CI turns green. Close or merge the PR.

You have now seen CI working.

---

## Step 7: Collect the Vercel values (for deploying from Actions)

You need 5 values. Do this once.

1. **Token**: vercel.com, Account Settings, **Tokens**, **Create**. Copy it. This is `VERCEL_TOKEN`.
2. **Org ID and Project IDs**. In your project root run, one time for each app:
   ```bash
   npx vercel link
   ```
   Choose the right Vercel project each time (host, products, cart). After each link, open `.vercel/project.json` and note:
   - `orgId` (same for all three) -> `VERCEL_ORG_ID`
   - `projectId` -> products / cart / host project ids

   Tip: run `vercel link` from the repo root for each project in turn and copy the `projectId` before linking the next one. Do **not** commit the `.vercel` folder (add `.vercel` to `.gitignore`).
   Alternative with no CLI: Vercel dashboard, project, **Settings, General**, copy **Project ID**. The Org ID is under team **Settings**.
3. **Preview env vars for the host**: in the Vercel host project, Settings, Environment Variables, make sure `PRODUCTS_URL` and `CART_URL` are enabled for **Preview** too (not only Production). Otherwise preview builds fall back to `localhost`.
4. Add the secrets in GitHub: repo, **Settings, Secrets and variables, Actions, New repository secret**:

   | Secret name | Value |
   |---|---|
   | `VERCEL_TOKEN` | the token |
   | `VERCEL_ORG_ID` | your org id |
   | `VERCEL_PRODUCTS_ID` | products project id |
   | `VERCEL_CART_ID` | cart project id |
   | `VERCEL_HOST_ID` | host project id |

---

## Step 8: Add the preview deploy workflow (safe, no production change)

New branch:
```bash
git checkout -b deploy-preview
```

Create `.github/workflows/deploy-preview.yml`:

```yaml
name: Deploy Preview

on:
  pull_request:

jobs:
  remotes:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [products, cart]
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ matrix.app == 'products' && secrets.VERCEL_PRODUCTS_ID || secrets.VERCEL_CART_ID }}
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: pnpm dlx vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - run: pnpm dlx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  host:
    needs: remotes              # host starts only after both remotes succeed
    runs-on: ubuntu-latest
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_HOST_ID }}
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: pnpm dlx vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - run: pnpm dlx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

Meaning of the three Vercel commands:
| Command | Job |
|---|---|
| `vercel pull` | Download project settings and env vars from Vercel |
| `vercel build` | Build on the GitHub machine |
| `vercel deploy --prebuilt` | Upload that build. Without `--prod` it makes a **preview URL**, production is untouched |

Notes:
- The three commands run from the repo root. If your Vercel projects have **Root Directory** set (host / products / cart), the CLI picks it up from the pulled settings.
- PRs from forks cannot read secrets. This is fine for your own repo.
- Add `.vercel` to `.gitignore` if it is not there.

Commit, push, open a PR:
```bash
git add .github .gitignore
git commit -m "add preview deploy workflow"
git push -u origin deploy-preview
```

Open the PR. You should see **CI / check** and **Deploy Preview** run. In the logs of `vercel deploy` you will see a preview URL. Open it and test.

When both are green, merge.

---

## Step 9: Switch to production deploys (last step)

Only do this after step 8 works.

1. Create `.github/workflows/deploy-prod.yml` (already in this repo). It triggers on `push` to `main` and has the same two jobs as the preview file (remotes first, then host), but the deploy step is just:
   ```yaml
   - run: npx --yes vercel@latest deploy --prod --yes
   ```
   There is no `vercel pull`, `vercel build` or `--prebuilt`. The source is uploaded and **Vercel builds it on its own servers**. Reason: `vercel pull` cannot download variables marked **Sensitive** (it writes the text `[SENSITIVE]` instead), which breaks `PRODUCTS_URL` / `CART_URL` in the host build. A build on Vercel can read them.
2. Stop Vercel from also deploying on push. In each of `host/vercel.json`, `products/vercel.json`, `cart/vercel.json` add:
   ```json
   "git": { "deploymentEnabled": false }
   ```
3. Do both changes in one PR, and merge it.

From now on: merge to `main` -> CI passes -> Actions deploys products and cart, then host.

**To go back to Vercel's own deploys:** remove the `git` line from the three `vercel.json` files and delete `deploy-prod.yml`.

---

## Step 10: Deploy only the app that changed

Steps 8 and 9 deployed **all three apps** on every PR and merge. That is slow, and a remote change does not need a host rebuild (the host loads the remote at runtime). Step 10 replaces `deploy-preview.yml` and `deploy-prod.yml` with:

| File | Job |
|---|---|
| `_deploy.yml` | Reusable. The one place that runs `vercel deploy` (`--prod` only for production). |
| `deploy-products.yml` | Runs when `products/**` changes |
| `deploy-cart.yml` | Runs when `cart/**` changes |
| `deploy-host.yml` | Runs when `host/**` changes |

How each per-app file works:
- **Pull request** -> a **preview** deploy. **Push to `main`** (a merged PR) -> a **production** deploy.
- `paths:` decides if it runs at all. Besides its own folder, it also runs for shared files: `pnpm-lock.yaml`, root `package.json`, `pnpm-workspace.yaml` and `.github/workflows/**`. Changes to those can affect every app, so all three deploy.
- Docs-only changes (`*.md`) run no deploy.
- `ci.yml` has **no** `paths:`. It stays the required check, and it always builds all three apps.
- Previews use the same remote build as production, so the `[SENSITIVE]` problem is gone for previews too.

Limits to know:
- If one merge changes several apps, they deploy **at the same time** (no more "remotes first").
- If you change the `mount` contract (how host and remote talk), ship the remote in one PR first, then the host in a second PR.

How to test it:
1. Change only a line in `products/src/pages/ListPage.tsx` and open a PR. Only **Deploy products** should run (plus CI).
2. Merge. Only one production deploy runs, and `mf-host` and `mf-cart` show no new deployment in Vercel.
3. Change only a `.md` file. Only CI runs.

---

## Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| Check `check` not in the branch-rule list | It has not run yet. Open a PR first, then edit the rule |
| `pnpm install --frozen-lockfile` fails | Lockfile not committed or out of date: run `pnpm install` locally and commit the lockfile |
| `Error: No Project Settings found` | `vercel pull` failed: wrong token or `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` |
| Preview host cannot load remotes | `PRODUCTS_URL` / `CART_URL` not set for the Preview environment in Vercel |
| Deploys happen twice | Vercel Git integration still on: add `git.deploymentEnabled: false` |
| Workflow does not start | File must be in `.github/workflows/` and end in `.yml`; check the Actions tab is enabled |
| CORS errors on a preview | Remote previews send `Access-Control-Allow-Origin: *` from `vercel.json`; check the header exists |

---

## Final flow (what you will have)

```
feature branch -> push -> open PR
                    |
                    +-- CI: install, typecheck, build        (must be green)
                    +-- Deploy Preview: preview URLs         (to test)
merge PR into main
                    |
                    +-- CI again
                    +-- Deploy Prod: products + cart -> host (live)
```
