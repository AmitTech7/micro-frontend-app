import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

type RemoteName = "products" | "cart";
type Status = "loading" | "ready" | "error";

// Each loader downloads that remote's remoteEntry.js (on first use) and gives
// back the "./mount" module it exposes. The strings must match the `remotes`
// keys in webpack.config.js + the `exposes` keys in the remote's config.
const loaders: Record<RemoteName, () => Promise<typeof import("products/mount")>> = {
  products: () => import("products/mount"),
  cart: () => import("cart/mount"),
};

export default function RemoteLoader({ remote }: Readonly<{ remote: RemoteName }>) {
  const { page } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    let mounted: MountResult | null = null;
    // A fresh element for every mount: a DOM node must never be shared
    // between an old remote root (still unmounting) and a new one.
    const el = document.createElement("div");
    containerRef.current!.appendChild(el);
    setStatus("loading");

    loaders[remote]()
      .then(({ mount }) => {
        if (cancelled) return;
        // Hand the remote a DOM node; it renders itself inside it.
        mounted = mount(el, { page });
        setStatus("ready");
      })
      .catch((err) => {
        console.error(`Failed to load remote "${remote}"`, err);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (mounted) mounted.unmount(); // clean up when the page/route changes
      el.remove();
    };
  }, [remote, page]);

  return (
    <div>
      {status === "loading" && <p>Loading {remote}...</p>}
      {status === "error" && (
        <p className="error">
          The "{remote}" app is not available. Is it running?
        </p>
      )}
      {/* The remote renders into this div */}
      <div ref={containerRef} />
    </div>
  );
}
