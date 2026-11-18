import { createRoot } from "react-dom/client";
import ListPage from "./pages/ListPage";
import FeaturedPage from "./pages/FeaturedPage";

// The contract with the host. These types describe exactly what the host may
// pass in and what it gets back.
export type MountProps = { page?: string };
export type MountResult = { unmount: () => void };

const pages: Record<string, () => JSX.Element> = {
  list: ListPage,
  featured: FeaturedPage,
};

// The host only knows this function. It knows nothing about our components.
export function mount(el: HTMLElement, { page = "list" }: MountProps = {}): MountResult {
  const Page = pages[page] ?? ListPage;
  const root = createRoot(el);
  root.render(<Page />);
  return {
    // deferred so React isn't asked to unmount while it is mid-render
    unmount: () => setTimeout(() => root.unmount(), 0),
  };
}
