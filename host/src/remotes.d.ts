// Federated modules are downloaded at runtime, so TypeScript can't find them
// on disk. We describe their shape here (it must match each remote's mount.tsx).
// In bigger projects these types are generated or published as a package.

// navigate: lets a remote send the user to another URL without owning a router.
// The host gives it to the remote (see RemoteLoader.tsx).
type MountProps = {
  page?: string; // first part of the URL after /products/  -> "categories"
  id?: string; // optional second part                      -> "42"
  navigate?: (path: string) => void;
};
type MountResult = { unmount: () => void };

declare module "products/mount" {
  export function mount(el: HTMLElement, props?: MountProps): MountResult;
}

declare module "cart/mount" {
  export function mount(el: HTMLElement, props?: MountProps): MountResult;
}
