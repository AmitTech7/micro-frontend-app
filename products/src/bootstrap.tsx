import { mount } from "./mount";
import type { MountResult } from "./mount";

// Standalone mode: run this app on its own at http://localhost:3001
// with buttons to switch pages (the host does this with its sidebar and router).
const root = document.getElementById("root")!;
root.innerHTML = `
  <p><em>Products running standalone</em></p>
  <button data-page="list">List</button>
  <button data-page="featured">Featured</button>
  <button data-page="categories">Categories</button>
  <div id="page"></div>
`;

let current: MountResult = mount(document.getElementById("page")!, { page: "list", navigate });

function show(page: string, id?: string) {
  current.unmount();
  // fresh container, because the old root is being unmounted
  const old = document.getElementById("page")!;
  const fresh = document.createElement("div");
  fresh.id = "page";
  old.replaceWith(fresh);
  current = mount(fresh, { page, id, navigate });
}

// Stand-in for the host's navigate: "/products/categories/42" -> page + id
function navigate(path: string) {
  const [, , page = "list", id] = path.split("/");
  show(page, id);
}

root.querySelectorAll<HTMLButtonElement>("button[data-page]").forEach((btn) => {
  btn.addEventListener("click", () => show(btn.dataset.page ?? "list"));
});
