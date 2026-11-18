import { cartItems } from "../data";

export default function ItemsPage() {
  return (
    <div>
      <h2>Cart Items</h2>
      <ul>
        {cartItems.map((i) => (
          <li key={i.id}>
            {i.name} x {i.qty} - ${i.price * i.qty}
          </li>
        ))}
      </ul>
    </div>
  );
}
