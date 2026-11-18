import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import RemoteLoader from "./RemoteLoader";

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Header />
        <div className="body">
          <Sidebar />
          <main className="content">
            <Routes>
              <Route path="/" element={<h2>Welcome to the shell app</h2>} />
              {/* :page becomes "list" / "featured" / "items" / "summary" */}
              <Route path="/products/:page" element={<RemoteLoader remote="products" />} />
              <Route path="/cart/:page" element={<RemoteLoader remote="cart" />} />
              <Route path="*" element={<h2>Not found</h2>} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
