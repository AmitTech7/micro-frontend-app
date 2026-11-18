import { createRoot } from "react-dom/client";
import ItemsPage from "./pages/ItemsPage";
import SummaryPage from "./pages/SummaryPage";

// Same contract as the products remote.
export type MountProps = { page?: string };
export type MountResult = { unmount: () => void };

const pages: Record<string, () => JSX.Element> = {
  items: ItemsPage,
  summary: SummaryPage,
};

export function mount(el: HTMLElement, { page = "items" }: MountProps = {}): MountResult {
  const Page = pages[page] ?? ItemsPage;
  const root = createRoot(el);
  root.render(<Page />);
  return {
    unmount: () => setTimeout(() => root.unmount(), 0),
  };
}
