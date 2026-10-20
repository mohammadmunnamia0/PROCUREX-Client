import { useEffect } from "react";

/** Ask the browser to confirm leaving the page while `active` (e.g. a form has unsaved edits). */
export function useBeforeUnload(active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
