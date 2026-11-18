type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: "Wireless Mouse", price: 25 },
  { id: 2, name: "Mechanical Keyboard", price: 80 },
  { id: 3, name: "USB-C Hub", price: 40 },
  { id: 4, name: "27\" Monitor", price: 210 },
];

export default function ListPage() {
  return (
    <div>
      <h2>Products</h2>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} - ${p.price}
          </li>
        ))}
      </ul>
    </div>
  );
}
