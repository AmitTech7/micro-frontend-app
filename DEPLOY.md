# Deploying to Vercel

Short answer: deploy **only `host`, `products` and `cart`**, as **three separate Vercel projects**.
The root `package.json`, `pnpm-workspace.yaml`, `start:all`, README and WORKFLOW.md are only for running everything locally. Vercel does not need them.

Each project gets its own URL:

```
https://mf-host.vercel.app        (the app users open)
https://mf-products.vercel.app    (loaded by the host)
https://mf-cart.vercel.app        (loaded by the host)
```

This is how micro frontends work in real teams: each app can be built and deployed on its own.

---

## What was already prepared in the code

| What | Where | Why |
|---|---|---|
| `build` script (`webpack --mode production`) | each app's `package.json` | Vercel runs it and publishes the `dist/` folder |
| Remote URLs come from env vars | [host/webpack.config.js](host/webpack.config.js) | In production the host must load remotes from their Vercel URLs, not `localhost` |
| CORS header on every file | [products/vercel.json](products/vercel.json), [cart/vercel.json](cart/vercel.json) | The host lives on a different domain, so the browser needs permission to load the remote's code |
| `remoteEntry.js` is never cached | same files | The host always gets the latest version of a remote |
| Route fallback to `index.html` | [host/vercel.json](host/vercel.json) | Refreshing on `/products/list` would 404 otherwise (the route only exists in the browser) |

Locally nothing changes: with no env vars set, the host still points at `localhost:3001` and `localhost:3002`.

---

## Step by step

### 1. Put the code in a Git repository
Push this folder to GitHub (or GitLab / Bitbucket). Vercel imports from there.
Use a repo whose root is this `mico frontend` folder, so the `pnpm-lock.yaml` and the three app folders are all inside it.

### 2. Create the two remote projects first
In Vercel: **Add New > Project**, pick the repo, then set:

| Setting | products project | cart project |
|---|---|---|
| Project name | `mf-products` | `mf-cart` |
| **Root Directory** | `products` | `cart` |
| Framework Preset | Other | Other |
| Environment variables | none | none |

Leave "Include source files outside of the Root Directory" **on** (the default). Vercel finds `pnpm-lock.yaml` at the repo root and uses pnpm.
Install, build and output settings come from each app's `vercel.json`.

Deploy both. Open `https://<name>.vercel.app/remoteEntry.js` in the browser to confirm it loads.

### 3. Create the host project
Same repo, new project:

| Setting | Value |
|---|---|
| Project name | `mf-host` |
| **Root Directory** | `host` |
| Framework Preset | Other |

Add two **Environment Variables** (Production, and Preview if you want):

| Name | Value |
|---|---|
| `PRODUCTS_URL` | `https://mf-products.vercel.app` |
| `CART_URL` | `https://mf-cart.vercel.app` |

**No trailing slash.** Use the stable production domain, not a per-deploy URL like `mf-products-abc123.vercel.app`.

Deploy. Open the host URL, click through the sidebar, and you are done.

### Order matters
`products` and `cart` first, because the host needs their URLs. If a remote's URL ever changes, update the env var and **redeploy the host** (the URL is baked in at build time).

### Using the Vercel CLI instead of Git
```bash
cd products && vercel --prod        # note the URL
cd ../cart  && vercel --prod        # note the URL
cd ../host  && vercel --prod -e PRODUCTS_URL=https://... -e CART_URL=https://...
```
(`-e` sets runtime env; for build-time values use `-b PRODUCTS_URL=... -b CART_URL=...`, or set them in the dashboard.)

---

## The nice part: independent deploys

- Change only the Products pages, then redeploy only `mf-products`. The host picks it up on the next page load. No host redeploy needed.
- Redeploy the host only when its own code or the remote URLs change.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Content area says "The ... app is not available" | Host cannot load the remote | Open `<remote URL>/remoteEntry.js` directly; check env var value in the host project; redeploy host after changing it |
| Console: blocked by CORS | Remote missing the CORS header | Check the remote's `vercel.json` is in the **remote's root directory** and was deployed |
| Host tries to load `localhost:3001` in production | Env vars missing at build time | Add `PRODUCTS_URL` / `CART_URL` to the **host** project, then redeploy |
| Refreshing `/products/list` gives 404 | Host rewrite missing | Check [host/vercel.json](host/vercel.json) is deployed and Root Directory is `host` |
| Remote changes do not show up | Old `remoteEntry.js` cached | The `no-cache` header should prevent this; hard refresh once and check headers in the Network tab |
| Build fails: "pnpm: command not found" / wrong package manager | Lockfile not seen | Keep "Include source files outside of the Root Directory" on, and commit `pnpm-lock.yaml` |
| Mixed content error | An `http://` remote URL used from an `https` host | Use `https://` URLs |

---

## Verify after deploying

1. Open the host URL. Header and sidebar appear.
2. Click each sidebar link. Pages from both remotes render, no errors in the console.
3. Refresh on `/cart/summary`. The page still loads.
4. Network tab: `remoteEntry.js` is requested from the products and cart domains.
5. Open each remote's own URL. It works standalone with its page buttons.
