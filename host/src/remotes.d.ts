// Federated modules are downloaded at runtime, so TypeScript can't find them
// on disk. We describe their shape here (it must match each remote's mount.tsx).
// In bigger projects these types are generated or published as a package.

type MountProps = { page?: string };
type MountResult = { unmount: () => void };

declare module "products/mount" {
  export function mount(el: HTMLElement, props?: MountProps): MountResult;
}

declare module "cart/mount" {
  export function mount(el: HTMLElement, props?: MountProps): MountResult;
}
