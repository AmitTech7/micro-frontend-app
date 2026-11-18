import { mount } from "./mount";
import type { MountResult } from "./mount";

// Standalone mode: run this app on its own at http://localhost:3001
// with two buttons to switch pages (the host does this with its sidebar).
const root = document.getElementById("root")!;
root.innerHTML = `
  <p><em>Products running standalone</em></p>
  <button data-page="list">List</button>
  <button data-page="featured">Featured</button>
  <div id="page"></div>
`;

let current: MountResult = mount(document.getElementById("page")!, { page: "list" });

root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    current.unmount();
    // fresh container, because the old root is being unmounted
    const old = document.getElementById("page")!;
    const fresh = document.createElement("div");
    fresh.id = "page";
    old.replaceWith(fresh);
    current = mount(fresh, { page: btn.dataset.page });
  });
});
