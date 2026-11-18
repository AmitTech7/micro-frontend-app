import { cartItems } from "../data";

export default function SummaryPage() {
  const total = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cartItems.reduce((sum, i) => sum + i.qty, 0);
  return (
    <div>
      <h2>Order Summary</h2>
      <p>Items: {count}</p>
      <p>
        <strong>Total: ${total}</strong>
      </p>
    </div>
  );
}
