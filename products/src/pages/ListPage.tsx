type Product = { id: number; name: string; price: number };

const products: Product[] = [
  { id: 1, name: "Wireless Mouse", price: 25 },
  { id: 2, name: "Mechanical Keyboard", price: 80 },
  { id: 3, name: "USB-C Hub", price: 40 },
  { id: 4, name: "27\" Monitor", price: 210 },
];

// CI/CD demo: this visible line should only appear on the live site after the PR is merged.
// The type below is deliberately wrong (a string assigned to a number) so CI fails first.
const deployNote: string  = "Deployed through the v7 CI/CD pipeline";

export default function ListPage() {
  return (
    <div>
      <h2>Products</h2>
      <p>{deployNote}</p>
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
