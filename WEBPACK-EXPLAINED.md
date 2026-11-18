# Webpack Explained (from zero, with Module Federation and interview Q&A)

Goal of this file: understand Webpack well enough to explain it in an interview,
and to see exactly how it joins our three apps (`host`, `products`, `cart`).

Contents
1. What is Webpack and why it exists
2. Core concepts (entry, output, loaders, plugins, mode, resolve, devServer)
3. How a build works, step by step
4. Our real config, line by line
5. Dev server vs production build
6. Code splitting and dynamic `import()`
7. Module Federation (how Webpack joins two apps)
8. Shared modules and singletons
9. Why `index.ts` is only `import("./bootstrap")`
10. `publicPath` and why remotes use `"auto"`
11. What `remoteEntry.js` really is
12. Full runtime sequence in our app
13. Webpack vs Vite, and other alternatives
14. Common errors
15. Interview Q&A (30 questions)
16. One-minute answers

---

## 1. What is Webpack and why it exists

**Webpack is a module bundler.** It starts from one file, follows every `import`, collects all the
files (JS, TS, CSS, images...), and produces a few optimized files the browser can run.

Why we need it:
- Browsers historically could not load hundreds of `import`ed files efficiently.
- Browsers do not understand TypeScript, JSX or CSS imports.
- We want minified, cache-friendly, split files for production.

Mental model:

```
 many source files           Webpack                few output files
 App.tsx, Header.tsx   -->  reads imports,   -->    main.js, 123.js,
 styles.css, logo.png       transforms, joins        styles, images
```

Webpack sees everything as a **module**: a `.tsx` file is a module, a `.css` file is a module,
a `.png` is a module. Loaders teach it how to read non-JS modules.

---

## 2. Core concepts

### 2.1 Entry
Where Webpack starts reading. From this file it builds a **dependency graph** (a tree of "who imports who").

```js
entry: "./src/index.ts"
```

### 2.2 Output
Where the built files go and what they are called.

```js
output: { path: "dist", filename: "[name].[contenthash].js", publicPath: "/" }
```

- `[contenthash]` changes only when the file content changes (good for browser caching).
- `publicPath` is the URL prefix the browser uses to load chunk files at runtime (see section 10).

### 2.3 Loaders
Webpack only understands JS and JSON. A **loader** converts other file types into modules.
Loaders run on a file **before** it is added to the bundle.

| Loader | Job |
|---|---|
| `babel-loader` | TypeScript/JSX/modern JS -> JS the browser runs |
| `css-loader` | reads `import "./a.css"` and turns CSS into a JS module |
| `style-loader` | injects that CSS into the page as a `<style>` tag |

Loaders in a rule run **right to left** (`["style-loader", "css-loader"]` runs css-loader first).

### 2.4 Plugins
Loaders transform **single files**. Plugins work on the **whole build** (hook into Webpack's lifecycle).

| Plugin | Job |
|---|---|
| `HtmlWebpackPlugin` | generates `index.html` and injects the script tags |
| `ModuleFederationPlugin` | lets apps share code at runtime (the star of this project) |

Short rule: **loader = per-file transform, plugin = whole-build job.**

### 2.5 Mode
`development` (fast rebuilds, readable code, source maps) or `production` (minified, tree-shaken, optimized).
We pass it from the CLI: `webpack serve --mode development`, `webpack --mode production`.

### 2.6 Resolve
How Webpack finds files when you write `import App from "./App"` (no extension).

```js
resolve: { extensions: [".tsx", ".ts", ".js"] }
```

### 2.7 devServer
A dev-only server with hot reload. Options we use: `port`, `historyApiFallback` (serve index.html
for any URL so client-side routes work on refresh), `headers` (CORS for the remotes).

### 2.8 Chunks and bundles (vocabulary)
- **Module**: one source file.
- **Chunk**: a group of modules Webpack decides belong together.
- **Bundle**: the actual output file of a chunk.

---

## 3. How a build works, step by step

1. **Read config** (`webpack.config.js`).
2. **Start at the entry** file.
3. **Resolve** each `import` to a real file path.
4. **Run loaders** on each file (TS -> JS, CSS -> JS module...).
5. **Parse** the result, find its imports, repeat. This builds the **dependency graph**.
6. **Optimize** (production): tree-shaking (drop unused exports), minify, split chunks.
7. **Plugins** act at various points (generate HTML, create `remoteEntry.js`...).
8. **Emit** files into `dist/`.

Webpack also wraps modules in a tiny **runtime** that keeps a table of modules and a `__webpack_require__`
function, so imports keep working after everything is merged into files.

---

## 4. Our real config, line by line

Every app has a `webpack.config.js` like this (simplified). The host one:

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;

const PRODUCTS_URL = process.env.PRODUCTS_URL || "http://localhost:3001";
const CART_URL     = process.env.CART_URL     || "http://localhost:3002";

module.exports = {
  entry: "./src/index.ts",                       // start here
  output: { publicPath: "/" },                   // chunks load from site root
  resolve: { extensions: [".tsx", ".ts", ".js"] },
  devServer: { port: 3000, historyApiFallback: true },
  module: {
    rules: [
      { test: /\.[jt]sx?$/, exclude: /node_modules/, loader: "babel-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      remotes: {
        products: `products@${PRODUCTS_URL}/remoteEntry.js`,
        cart:     `cart@${CART_URL}/remoteEntry.js`,
      },
      shared: {
        react:       { singleton: true, requiredVersion: "18.3.1" },
        "react-dom": { singleton: true, requiredVersion: "18.3.1" },
      },
    }),
    new HtmlWebpackPlugin({ template: "./public/index.html" }),
  ],
};
```

| Piece | Plain meaning |
|---|---|
| `entry` | Start reading at `src/index.ts` |
| `rules` + `babel-loader` | Turn TS/JSX into plain JS (`.babelrc` has the presets) |
| `css-loader`, `style-loader` | Allow `import "./styles.css"` |
| `HtmlWebpackPlugin` | Make `index.html` and add the script tags automatically |
| `ModuleFederationPlugin` | The micro-frontend part (sections 7 to 11) |
| `process.env.PRODUCTS_URL` | Remote URL is chosen at **build time** (this is why Vercel needs env vars before the build) |
| `historyApiFallback` | Refreshing `/products/list` still serves the app |

A remote (`products`, port 3001) differs in the Module Federation block:

```js
new ModuleFederationPlugin({
  name: "products",
  filename: "remoteEntry.js",
  exposes: { "./mount": "./src/mount" },
  shared: { react: { singleton: true }, "react-dom": { singleton: true } },
})
```
and `output.publicPath: "auto"`, plus CORS header `Access-Control-Allow-Origin: *` in `devServer`.

**TypeScript note:** Babel only **removes** types, it does not check them. Type checking is a separate
command: `tsc --noEmit` (our `pnpm typecheck`).

---

## 5. Dev server vs production build

| | `webpack serve` (dev) | `webpack --mode production` (build) |
|---|---|---|
| Output | In memory, nothing written to disk | Files in `dist/` |
| Speed | Fast incremental rebuilds | Slower, fully optimized |
| Code | Readable, source maps | Minified, tree-shaken |
| Reload | Auto refresh on save (HMR/live reload) | n/a |
| Used for | Local development | Deploying (Vercel runs `pnpm build`) |

**HMR (Hot Module Replacement):** replaces changed modules in the running page without a full reload.

---

## 6. Code splitting and dynamic `import()`

Normal `import x from "./x"` -> same bundle, loaded up front.
`import("./x")` -> Webpack puts `x` in a **separate chunk** and downloads it **only when that line runs**.
It returns a Promise.

```ts
import("products/mount").then(({ mount }) => { ... });
```

Why it matters for us: this one line is how the host downloads a remote **only when the user opens that route**.
Same idea powers `React.lazy`.

Other splitting: multiple entries, and `splitChunks` (auto-extracts shared vendor code).

**Tree shaking:** in production, Webpack removes exports nobody imports (works with ES modules).

---

## 7. Module Federation: how Webpack joins two apps

Introduced in **Webpack 5**. Idea: **an app can load code from another separately built and deployed app, at runtime.**

Before this, to share code you either published npm packages (rebuild and redeploy every consumer on each change)
or built one giant app. Module Federation lets teams deploy independently.

Roles (an app can be both):
- **Host (container consumer):** asks for code. Config: `remotes`.
- **Remote (container provider):** offers code. Config: `exposes` + `filename`.

```
 products app build                     host app build
 ──────────────────                     ──────────────
 exposes: "./mount"      <──────────    remotes: products@URL/remoteEntry.js
 produces remoteEntry.js                import("products/mount")
```

Three things connect them:
1. Remote **name** (`products`) must match between the remote's `name` and the key in the host's `remotes`.
2. Remote's **exposed key** (`./mount`) -> host import path is `<name>/<key>` = `products/mount`.
3. The **URL** of `remoteEntry.js`.

Important: it is the **browser** that downloads the remote, not the host server. So the remote URL
must be public and send CORS headers.

---

## 8. Shared modules and singletons

Problem: host and both remotes all use React. Without sharing, the page would load React 3 times
and hooks break ("Invalid hook call") because components and renderer use different copies.

```js
shared: {
  react:       { singleton: true, requiredVersion: "18.3.1" },
  "react-dom": { singleton: true, requiredVersion: "18.3.1" },
}
```

- `shared`: "do not bundle your own private copy blindly. Negotiate with the other apps."
- `singleton: true`: "only ONE copy may exist on the page. Everyone uses it."
- `requiredVersion`: the version range this app accepts. If versions clash, Webpack warns (singleton) or loads another copy (non-singleton).

How negotiation works: at startup each app registers its version in a shared **scope**. The first/highest
compatible version wins and everybody else reuses it. The loser app does not download its own React.

---

## 9. Why `index.ts` is only `import("./bootstrap")`

```ts
// index.ts
import("./bootstrap");
```

Sharing React needs an async step (negotiate versions, maybe fetch remote code). If the entry file
directly imports React, it runs **before** negotiation finishes and Webpack throws:

> `Shared module is not available for eager consumption`

The dynamic `import()` creates an async boundary: Webpack first sets up the shared scope, then loads
`bootstrap.tsx` (where React is actually used). This is the standard Module Federation pattern. Every app has it.

---

## 10. `publicPath` and why remotes use `"auto"`

`publicPath` = the URL base used to load **other chunks** at runtime.

- Host: `"/"`, its own chunks are at its own site root.
- Remote: `"auto"`, Webpack figures it out from the URL the `remoteEntry.js` script was loaded from.
  So when the host (port 3000) loads the remote from 3001 (or from `https://xyz.vercel.app`), the remote's
  extra chunks are fetched from **its own** origin, not the host's. Hardcoding `/` here would make the
  browser look for the remote's chunks on the host and fail with 404.

---

## 11. What `remoteEntry.js` really is

A small file Webpack generates for a remote. Think of it as a **menu plus order desk**:

- It lists what is exposed (`./mount`).
- It knows which chunk files contain each exposed module.
- It provides `init(sharedScope)` (join the shared-React negotiation) and `get("./mount")` (give me that module).

It is **small**, because the real code lives in separate chunks that are only fetched when asked for.

Caching: `remoteEntry.js` must **not** be cached long, otherwise users never see a new deploy.
That is why `vercel.json` of products and cart sets `Cache-Control: no-cache` for `/remoteEntry.js`.
The other chunks have hashed names, so they can be cached forever.

---

## 12. Full runtime sequence in our app

User opens `/products/list`:

1. Browser loads host `index.html` and its scripts. `index.ts` runs `import("./bootstrap")`.
2. Host Webpack runtime sets up the **shared scope**, registers React 18.3.1.
3. `bootstrap.tsx` renders `<App />`. Router matches `/products/:page`. `RemoteLoader` runs.
4. `import("products/mount")` executes. Webpack's runtime sees "products" is a remote:
   1. Loads the script `PRODUCTS_URL/remoteEntry.js` (cross-origin, needs CORS).
   2. Calls the container's `init(sharedScope)`. The remote agrees to use the host's React.
   3. Calls `get("./mount")`. Container fetches the needed chunk(s) and returns a factory.
5. The host receives `{ mount }` and calls `mount(el, { page })`.
6. The remote uses the **shared** React (`createRoot`) to render its page into `el`.
7. On leaving the route, host calls `unmount()`.

```
Browser ──GET──> host (3000): index.html, main.js
   │
   └─ import("products/mount")
        ├──GET──> products (3001): remoteEntry.js   (the menu)
        ├── init(shared React)  /  get("./mount")
        └──GET──> products (3001): chunk with mount + pages
```

If products is down, step 4.1 fails, the Promise rejects, and `RemoteLoader` shows "not available".
Host keeps working (failure isolation).

---

## 13. Webpack vs Vite, and alternatives

| | Webpack | Vite |
|---|---|---|
| Dev start | Bundles first (slower on big apps) | No bundling in dev, native ES modules (very fast) |
| Production | Webpack itself | Rollup (esbuild in dev) |
| Config | Powerful but verbose | Simpler defaults |
| Module Federation | **Native** (invented here) | Via plugin (`@originjs/vite-plugin-federation`, or Module Federation 2.0 tooling) |
| Ecosystem | Huge, mature, many legacy apps | Newer, growing quickly |

Others: Rollup (libraries), esbuild (very fast), Parcel (zero config), Turbopack (Next.js), Rspack (Webpack-compatible, written in Rust, supports Module Federation).

Alternatives for micro-frontends without federation: iframes, Web Components, single-spa, npm packages, server-side composition.

---

## 14. Common errors (and what they mean)

| Error | Cause | Fix |
|---|---|---|
| `Shared module is not available for eager consumption` | Entry imports React directly | `index.ts` = `import("./bootstrap")` |
| `Invalid hook call` | Two React copies | `singleton: true`, same version everywhere |
| CORS error loading `remoteEntry.js` | Remote doesn't allow host origin | `Access-Control-Allow-Origin` header on remote |
| `Cannot find module 'products/mount'` (TypeScript) | No type declaration | Add to `host/src/remotes.d.ts` |
| `Loading chunk X failed` / 404 on remote chunk | Wrong `publicPath` on remote | Use `"auto"` |
| Old UI after deploy | `remoteEntry.js` cached | `no-cache` header on that file |
| Host calls wrong URL in production | Env var not set before build | Set `PRODUCTS_URL`/`CART_URL`, then redeploy host |
| `Module not found: css-loader` | Loader not installed | `pnpm add -D css-loader style-loader` |

---

## 15. Interview Q&A

**1. What is Webpack?**
A static module bundler. It builds a dependency graph from an entry file and outputs optimized bundles for the browser.

**2. Why do we need a bundler?**
To combine many modules, support TS/JSX/CSS, minify, tree-shake, split code and cache well.

**3. What are the core concepts?**
Entry, output, loaders, plugins, mode (plus resolve and devServer).

**4. Loader vs plugin?**
Loader transforms one file type into a module (runs per file). Plugin extends the whole build process (HTML generation, federation, minify).

**5. In what order do loaders run?**
Right to left (or bottom to top) in a `use` array.

**6. What does `babel-loader` do here?**
Compiles TS/JSX to JS. It strips types without checking them, so we run `tsc --noEmit` separately.

**7. What does `HtmlWebpackPlugin` do?**
Generates `index.html` and injects the output script tags (with hashed names).

**8. Dev vs production mode?**
Dev: fast, readable, source maps. Production: minify, tree-shake, scope hoisting, hashed names.

**9. What is a chunk vs a bundle?**
Chunk is a logical group of modules. Bundle is the emitted file for it.

**10. What is code splitting and how do you do it?**
Splitting output into multiple files loaded on demand. Use dynamic `import()`, `React.lazy`, multiple entries or `splitChunks`.

**11. What is tree shaking?**
Removing unused exports from the final bundle. Needs ES module syntax and production mode.

**12. What is HMR?**
Hot Module Replacement. Swaps changed modules in the running app without a full reload.

**13. What is `contenthash`?**
A hash of file contents in the filename. Changes only when the content changes, enabling long-term caching.

**14. What is `publicPath`?**
The URL base Webpack uses to fetch chunks at runtime.

**15. What is Module Federation?**
Webpack 5 feature that lets separately built and deployed apps share modules at runtime.

**16. Host vs remote?**
Host consumes (`remotes`). Remote provides (`exposes`). An app can be both.

**17. What is `remoteEntry.js`?**
The generated manifest/container of a remote: lists exposed modules, provides `init` and `get`.

**18. How does the host know where a remote is?**
`remotes: { products: "products@URL/remoteEntry.js" }`. Format is `name@url`.

**19. What does `exposes` do?**
Maps a public name (`./mount`) to a local file. The host imports it as `products/mount`.

**20. What does `shared` do?**
Prevents duplicate libraries by negotiating one copy across apps at runtime.

**21. Why `singleton: true` for React?**
Two React copies break hooks and context. Singleton forces a single instance.

**22. What if shared versions don't match?**
Webpack picks the highest compatible version. With a singleton and an unsatisfied `requiredVersion` it warns (or errors if `strictVersion`). Without singleton it loads the other copy.

**23. Why the async bootstrap (`import("./bootstrap")`)?**
Shared modules are resolved asynchronously. An immediate import causes the "eager consumption" error.

**24. Why `publicPath: "auto"` on remotes?**
So their chunks load from the remote's own origin, wherever it is deployed.

**25. Why does a remote need CORS headers?**
The browser fetches `remoteEntry.js` from a different origin than the host page.

**26. How do you deploy independently?**
Each app is its own build/deploy. Remote URL is injected into the host at build time (env var). Deploy remotes first, then the host.

**27. How do you handle a remote being down?**
Catch the rejected `import()` and show a fallback UI. Rest of the host still works. We do this in `RemoteLoader`.

**28. Why not hardcode the remote URL?**
Different per environment (local/staging/prod). We read `process.env` at build time. For true runtime config, use dynamic remotes (load URL from an API or manifest).

**29. How do you share types between host and remote?**
Remote code is unknown at build time, so declare types manually (`remotes.d.ts`), or publish/generate a types package (Module Federation tooling can generate them).

**30. Drawbacks of micro frontends / Module Federation?**
More complexity, version drift of shared libs, harder debugging, duplicated tooling, runtime failures instead of build failures, need for strict contracts (like our `mount` signature).

**Bonus: Webpack vs Vite?**
Vite is faster in dev (native ESM, no bundling) and simpler. Webpack is more mature, has native Module Federation, and a bigger plugin ecosystem.

**Bonus: How would you speed up a slow Webpack build?**
Persistent cache (`cache: { type: "filesystem" }`), `thread-loader`, narrower `include/exclude`, `esbuild-loader`/`swc-loader` instead of Babel, fewer source-map costs in dev, or move to Rspack.

---

## 16. One-minute answers (say these out loud)

**What is Webpack?**
"Webpack is a module bundler. It starts at an entry file, follows all imports, uses loaders to handle TypeScript, JSX and CSS, uses plugins for jobs like generating HTML, and outputs optimized files for the browser."

**How does Webpack join your two apps?**
"With Module Federation. The remote app lists `exposes: { './mount': './src/mount' }`, and Webpack builds a `remoteEntry.js` for it. The host lists that URL under `remotes`. At runtime the host calls `import('products/mount')`, the browser downloads `remoteEntry.js`, the two apps agree to share one React copy, and the host gets the remote's `mount` function and calls it. Nothing from the remote is bundled into the host, and each app deploys on its own."

**Why does `shared` with `singleton` matter?**
"Without it the page would load several React copies and hooks would break. Singleton makes every app use one."
