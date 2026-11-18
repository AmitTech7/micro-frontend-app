# Micro Frontend Demo (React + Module Federation)

Three small, independent React apps that combine into one page at runtime.

| App      | Port | Role                                  |
|----------|------|---------------------------------------|
| host     | 3000 | Shell: header, sidebar, routing       |
| products | 3001 | Remote: pages `list`, `featured`      |
| cart     | 3002 | Remote: pages `items`, `summary`      |

## Run it

Uses [pnpm](https://pnpm.io) workspaces (`pnpm-workspace.yaml` lists host, products, cart).

```bash
pnpm install         # one command at the root installs all three apps
pnpm start:all       # starts all three in parallel
```

Or run one app at a time: `pnpm --filter host start` (same for `products`, `cart`).

Open:
- http://localhost:3000 - the full app (use the sidebar)
- http://localhost:3001 and http://localhost:3002 - each remote on its own

**Full step-by-step explanation (good for walkthroughs): [WORKFLOW.md](WORKFLOW.md).**

**Deploying to Vercel: [DEPLOY.md](DEPLOY.md)** (three separate projects: host, products, cart).

Written in TypeScript. Check types in all apps with `pnpm typecheck`.

## The ideas, simply

- **Micro frontend** = split a UI into separately built and deployed apps, composed in the browser.
- **Host** = the shell the user visits. It owns layout and routing, nothing else.
- **Remote** = an app that publishes some code for others. It builds a `remoteEntry.js` file, a "menu" of what it exposes.
- **`exposes`** (remote config) says what to publish. Here: `./mount`.
- **`remotes`** (host config) says where to find the remotes' menus.
- **`import("products/mount")`** in the host downloads `remoteEntry.js` from port 3001 at runtime, then fetches the code.
- **`mount(el, { page })`** is the contract. The host hands over a DOM element; the remote renders itself into it and returns `{ unmount }`. The host knows nothing about the remote's components (it could even be Vue).
- **`shared` + `singleton`** makes all apps use ONE copy of React. Two copies break hooks.
- **`index.ts` -> `import("./bootstrap")`** gives Module Federation time to settle shared modules before the app starts. Without it you get "Shared module is not available for eager consumption".

## Things to try

1. Stop only the cart app: Products still works, Cart shows an error message. Failure isolation.
2. Edit text in `products/src/pages/ListPage.tsx`: the host updates without touching host code.
3. Network tab: `remoteEntry.js` is fetched from 3001/3002 the first time you visit a remote page.
