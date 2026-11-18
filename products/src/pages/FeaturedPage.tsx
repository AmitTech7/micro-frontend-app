type FeaturedProduct = { id: number; name: string; note: string };

const featured: FeaturedProduct[] = [
  { id: 2, name: "Mechanical Keyboard", note: "Best seller this week" },
  { id: 4, name: "27\" Monitor", note: "Editor's pick" },
];

export default function FeaturedPage() {
  return (
    <div>
      <h2>Featured Products</h2>
      {featured.map((p) => (
        <div key={p.id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 8 }}>
          <strong>{p.name}</strong>
          <div>{p.note}</div>
        </div>
      ))}
    </div>
  );
}
