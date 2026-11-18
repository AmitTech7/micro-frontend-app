import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <NavLink to="/" end>Home</NavLink>

      <div className="group">Products (remote)</div>
      <NavLink to="/products/list">List</NavLink>
      <NavLink to="/products/featured">Featured</NavLink>
      <NavLink to="/products/categories">Categories</NavLink>

      <div className="group">Cart (remote)</div>
      <NavLink to="/cart/items">Items</NavLink>
      <NavLink to="/cart/summary">Summary</NavLink>
    </nav>
  );
}
