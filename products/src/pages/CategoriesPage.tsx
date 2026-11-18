import type { PageProps } from "../mount";

type Category = { id: number; name: string; items: number; description: string };

const categories: Category[] = [
  { id: 1, name: "Accessories", items: 12, description: "Mice, stands and everyday desk gear." },
  { id: 2, name: "Keyboards", items: 8, description: "Mechanical and wireless keyboards." },
  { id: 3, name: "Monitors", items: 5, description: "Screens for work and play." },
  { id: 42, name: "Gaming Gear", items: 9, description: "Headsets, controllers and gaming extras." },
];

// Two screens in one component:
//   no id  -> the list         (URL: /products/categories)
//   has id -> the detail page  (URL: /products/categories/42)
export default function CategoriesPage({ id, navigate }: Readonly<PageProps>) {
  if (id === undefined) {
    return (
      <div>
        <h2>Categories</h2>
        <ul>
          {categories.map((c) => (
            <li key={c.id}>
              {/* navigate() asks the HOST to change the URL (this app has no router) */}
              <button onClick={() => navigate?.(`/products/categories/${c.id}`)}>
                {c.name} ({c.items} items)
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const category = categories.find((c) => String(c.id) === id);

  return (
    <div>
      <button onClick={() => navigate?.("/products/categories")}>&larr; Back to categories</button>
      {category ? (
        <div>
          <h2>{category.name}</h2>
          <p>Category id: {category.id}</p>
          <p>Items in this category: {category.items}</p>
          <p>{category.description}</p>
        </div>
      ) : (
        <h2>Category not found (id: {id})</h2>
      )}
    </div>
  );
}
