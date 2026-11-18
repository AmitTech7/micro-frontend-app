// Why this one-liner? Module Federation must first agree with other apps on
// which copy of React to share. That negotiation is async, so the real app
// code lives in bootstrap.jsx and is loaded with a dynamic import.
import("./bootstrap");
