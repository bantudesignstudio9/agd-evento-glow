import { useEffect, useState } from "react";

export function useStoreVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = () => setV((x) => x + 1);
    window.addEventListener("agd:update", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("agd:update", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return v;
}
