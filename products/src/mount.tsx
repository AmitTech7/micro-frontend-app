import { createRoot } from "react-dom/client";
import ListPage from "./pages/ListPage";
import FeaturedPage from "./pages/FeaturedPage";
import CategoriesPage from "./pages/CategoriesPage";

// The contract with the host. These types describe exactly what the host may
// pass in and what it gets back.
export type Navigate = (path: string) => void;
export type MountProps = { page?: string; id?: string; navigate?: Navigate };
export type MountResult = { unmount: () => void };

// What every page receives. Pages that don't need these can ignore them.
export type PageProps = { id?: string; navigate?: Navigate };

// The "phone book": page name (from the URL) -> component.
const pages: Record<string, (props: PageProps) => JSX.Element> = {
  list: ListPage,
  featured: FeaturedPage,
  categories: CategoriesPage,
};
// The host only knows this function. It knows nothing about our components.
export function mount(
  el: HTMLElement,
  { page: number = "list", id, navigate }: MountProps = {},
): MountResult {
  const Page = pages[page] ?? ListPage;
  const root = createRoot(el);
  root.render(<Page id={id} navigate={navigate} />);
  return {
    // deferred so React isn't asked to unmount while it is mid-render
    unmount: () => setTimeout(() => root.unmount(), 0),
  };
}
