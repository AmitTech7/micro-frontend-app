# How Routing Works Here (and what `mount.tsx` really does)

**One-sentence answer:**
The **URL belongs to the host**. The remote has **no router at all**. The remote only has a small **lookup table** (`mount.tsx`) that turns a page *name* into a page *component*.

---

## 1. The simple mental model

You already know normal react-router:

```
URL  --->  <Route path="..." element={<Component />} />  --->  Component on screen
```

Here the same job is **split in two halves**, in two different apps:

| Half | Who does it | Where | Question it answers |
|---|---|---|---|
| Half 1 | **Host** (react-router) | [host/src/App.tsx](host/src/App.tsx) | "Which **app** (products or cart) should handle this URL, and what is the page name?" |
| Half 2 | **Remote** (a plain lookup table) | [products/src/mount.tsx](products/src/mount.tsx) | "Given this page **name**, which **component** do I show?" |

Think of a restaurant:
- **Host = the waiter.** Takes your order (the URL) and decides which kitchen it goes to.
- **Remote = the kitchen.** It does not talk to customers. It only knows: "order says *categories* -> I cook the Categories dish."
- **`mount` = the kitchen's service window.** The waiter passes the order in, the dish comes out on the table.

---

## 2. Everything in one picture

Example: the user clicks **Categories** under Products in the sidebar.

```
 HOST (react-router lives here)                        PRODUCTS REMOTE (no router)
 ─────────────────────────────                         ───────────────────────────
 Sidebar.tsx
   <NavLink to="/products/categories">
        │  click
        ▼
 URL becomes  /products/categories
        │
        ▼
 App.tsx
   <Route path="/products/:page" ...>
        │   ":page" captures  "categories"
        ▼
 RemoteLoader.tsx
   page = "categories"
   import("products/mount")  ───────────────────────▶   mount.tsx
   mount(el, { page: "categories" })                      const pages = {
        │                                                    list:       ListPage,
        │                                                    featured:   FeaturedPage,
        │                                                    categories: CategoriesPage,   <-- found!
        │                                                 }
        │                                                 root.render(<CategoriesPage />)
        ▼                                                          │
 Categories screen appears inside the host's content area  ◀───────┘
```

---

## 3. The steps, one by one (with the real code)

### Step 1: The sidebar link creates the URL
[host/src/Sidebar.tsx](host/src/Sidebar.tsx)

```tsx
<NavLink to="/products/categories">Categories</NavLink>
```

Clicking it changes the browser URL to `/products/categories`. No page reload. This is plain react-router, nothing special.

> The word **categories** at the end of the URL is the **page name**. It is just text.

### Step 2: The host route catches it
[host/src/App.tsx](host/src/App.tsx)

```tsx
<Route path="/products/:page" element={<RemoteLoader remote="products" />} />
```

- `/products/` -> "this belongs to the **products** app"
- `:page` -> a placeholder that grabs whatever comes next. For our URL, `page = "categories"`.

Notice: the host does **not** have a route for each product page. **One** route handles all of them. That is why we never had to touch `App.tsx` when adding Categories.

### Step 3: `RemoteLoader` reads the page name and calls the remote
[host/src/RemoteLoader.tsx](host/src/RemoteLoader.tsx)

```tsx
const { page } = useParams();                     // page = "categories"

import("products/mount").then(({ mount }) => {   // get the remote's mount function
  mounted = mount(el, { page });                  // "show the 'categories' page inside this box"
});
```

It does two things: (1) reads `:page` from the URL with `useParams` (normal react-router), and (2) hands that name to the remote's `mount` function, together with an empty box (`el`) to draw in.

### Step 4: `mount.tsx` turns the name into a component
[products/src/mount.tsx](products/src/mount.tsx)

```tsx
const pages = {
  list: ListPage,
  featured: FeaturedPage,
  categories: CategoriesPage,
};

export function mount(el, { page = "list" }) {
  const Page = pages[page] ?? ListPage;   // look the name up; unknown name -> List page
  const root = createRoot(el);            // start React inside the box
  root.render(<Page />);                  // draw the chosen page
  return { unmount: () => root.unmount() };
}
```

This is the heart of it. Read it line by line:

| Line | Plain meaning |
|---|---|
| `const pages = {...}` | A **phone book**: name on the left, component on the right. |
| `pages[page]` | Look up the name we were given (`"categories"`). Result: `CategoriesPage`. |
| `?? ListPage` | If the name is not in the phone book, show the List page instead (a safe default). |
| `createRoot(el)` | Start a small React app inside the box the host gave us. |
| `root.render(<Page />)` | Draw the page in that box. **This is the moment the user sees it.** |
| `return { unmount }` | Give the host a "remove it" button, so it can clean up when the user leaves. |

So `mount.tsx` **is** the routing for the remote, but it is a lookup, not a router. No URLs, no `<Route>`, no `react-router-dom` inside products.

---

## 4. The key idea to say out loud

> "In a normal app, react-router maps a **URL** to a **component**.
> Here, the host's react-router maps a URL to a **remote app plus a page name**,
> and the remote's `mount` function maps that **page name** to a **component**.
> Two small lookups instead of one big router."

Why build it like this?
- The host never imports the remote's components. It only knows `mount` and a page name.
- The remote can add, rename or reorganise its pages **without touching host routing code** (only a sidebar link, because the sidebar is the host's menu).
- The remote still works alone on its own port, because `mount` doesn't need the host.

---

## 5. Normal react-router vs this setup

| | Normal single app | This micro frontend |
|---|---|---|
| Who owns the URL? | The one app | **The host only** |
| Route list | `<Route path="/products/categories" element={<CategoriesPage/>} />` per page | One host route `/products/:page` + the remote's `pages` table |
| Page name -> component | Done by `<Route element=...>` | Done by `pages[page]` in `mount.tsx` |
| Links | `<NavLink>` in the app | `<NavLink>` in the **host** sidebar |
| Remote needs react-router? | n/a | **No** |

---

## 6. How to add a new page (the whole checklist)

Example: add a "Deals" page to Products.

1. **Create the page:** `products/src/pages/DealsPage.tsx` (a normal React component).
2. **Register it in the phone book:** in `products/src/mount.tsx`
   ```tsx
   import DealsPage from "./pages/DealsPage";
   const pages = { ..., deals: DealsPage };
   ```
3. **Add the menu link in the host:** in `host/src/Sidebar.tsx`
   ```tsx
   <NavLink to="/products/deals">Deals</NavLink>
   ```

The word after `/products/` in step 3 **must match the key** in step 2 (`deals`). That is the only link between them.
That is the full list. No change to `App.tsx`, `RemoteLoader.tsx` or any webpack config.

---

## 6b. Detail pages: `/products/categories/42`

The route `/products/:page` matches **exactly one** piece after `/products/`.
So `/products/categories/42` (two pieces) did **not** match and showed "Not found".
Three small changes make it work.

**1. The host gets a second route** ([host/src/App.tsx](host/src/App.tsx)):
```tsx
<Route path="/products/:page"     element={<RemoteLoader remote="products" />} />
<Route path="/products/:page/:id" element={<RemoteLoader remote="products" />} />
```
For `/products/categories/42`: `page = "categories"`, `id = "42"`.

**2. `RemoteLoader` passes the `id` too** ([host/src/RemoteLoader.tsx](host/src/RemoteLoader.tsx)):
```tsx
const { page, id } = useParams();
mount(el, { page, id, navigate });
```

**3. The page uses the `id`** ([products/src/pages/CategoriesPage.tsx](products/src/pages/CategoriesPage.tsx)).
One component shows two screens:
```tsx
if (id === undefined) -> show the list      // /products/categories
else                  -> show the detail    // /products/categories/42
```
`mount.tsx` hands `id` to whichever page it picked: `<Page id={id} navigate={navigate} />`.

### The new `navigate` piece: how does the remote change the URL?

The list needs a click that goes to `/products/categories/42`.
But the remote has **no router**, so it cannot change the URL on its own.
(A plain `<a href>` would work but reloads the whole app, which we do not want.)

So the **host lends the remote a function**. `RemoteLoader` takes react-router's `useNavigate()` and passes it in as `navigate`:

```tsx
// host:    mount(el, { page, id, navigate })
// remote:  <button onClick={() => navigate("/products/categories/42")}>
```

The remote says "please go to this URL". The host's router does it, with no page reload.
The URL still belongs to the host. The remote only **asks**.

### The full flow for a click on "Gaming Gear"

```
Categories list (remote)
   click  ->  navigate("/products/categories/42")      [function given by host]
        │
        ▼
Host router: URL is now /products/categories/42
   route "/products/:page/:id"  ->  page="categories", id="42"
        │
        ▼
RemoteLoader  ->  mount(el, { page: "categories", id: "42", navigate })
        │
        ▼
mount.tsx: pages["categories"] = CategoriesPage   ->  <CategoriesPage id="42" />
        │
        ▼
id is set  ->  detail screen for category 42
```

Good to know:
- Refreshing on `/products/categories/42` works: the host reads the URL again and runs the same steps.
- An unknown id (`/products/categories/999`) shows "Category not found" instead of crashing.
- Changing the id remounts the remote into a fresh box (same safe pattern as before).

### Checklist: add a detail page for any page

1. Make sure the host has the two-piece route (`/products/:page/:id`). It already does for products and cart.
2. In the remote page, read the `id` prop and show the detail when it is set.
3. Link to it with `navigate("/products/<page>/<id>")`.

---

## 7. Common questions (good for explaining to others)

**Q: If there is no router in products, how does the URL change?**
The host's sidebar changes it. The remote never touches the URL.

**Q: What if someone types `/products/banana` in the address bar?**
The host route still matches (`:page = "banana"`). `pages["banana"]` finds nothing, so the `?? ListPage` fallback shows the List page. If you prefer a "Not found" page, change that fallback.

**Q: Why does `mount` get a box (`el`) instead of just returning a component?**
Because the host and the remote each run their **own React**. The host says "here is an empty box, draw yourself in it". That keeps the two apps independent: the host does not need to know how the remote is built.

**Q: Why `unmount`?**
When the user clicks another link, the host must remove the old page from the box. Without it, old pages would stay in memory.

**Q: Where would a deep link like `/products/categories` come from after a refresh?**
The browser asks the host for that URL, the host serves its app, and react-router runs Steps 2 to 4 again from the top. (On Vercel, the rewrite in `host/vercel.json` makes this work.)

---

## 8. Two-minute explanation script

> "The host app owns routing with react-router. It has one route, `/products/:page`. When you click Categories, the URL becomes `/products/categories`, and the host reads `categories` from the URL.
> It then loads the products app's `mount` function and calls `mount(box, { page: 'categories' })`.
> Inside the products app, `mount` is just a lookup table: it finds `categories` in a list of pages, gets `CategoriesPage`, and renders it into the box.
> So the host decides **which app**, the remote decides **which page**. To add a page you create the component, add one line to the remote's table, and add one sidebar link in the host."
