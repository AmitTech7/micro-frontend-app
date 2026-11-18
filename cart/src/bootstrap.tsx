import { mount } from "./mount";
import type { MountResult } from "./mount";

// Standalone mode: http://localhost:3002
const root = document.getElementById("root")!;
root.innerHTML = `
  <p><em>Cart running standalone</em></p>
  <button data-page="items">Items</button>
  <button data-page="summary">Summary</button>
  <div id="page"></div>
`;

let current: MountResult = mount(document.getElementById("page")!, { page: "items" });

root.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    current.unmount();
    const old = document.getElementById("page")!;
    const fresh = document.createElement("div");
    fresh.id = "page";
    old.replaceWith(fresh);
    current = mount(fresh, { page: btn.dataset.page });
  });
});
