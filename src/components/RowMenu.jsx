import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreHorizontal } from "react-icons/fi";

const MENU_WIDTH = 190;

/**
 * "⋯" overflow menu for secondary row actions. Rendered in a portal with fixed
 * positioning so scrolling table containers never clip it.
 * items: [{ label, icon, onClick, danger, hidden }]
 */
export default function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const visible = items.filter((i) => !i.hidden);

  /** Anchors the menu under (or above) its button; returns false when the button is off-screen. */
  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return false;
    const height = visible.length * 38 + 12;
    const left = Math.max(8, Math.min(window.innerWidth - MENU_WIDTH - 8, r.right - MENU_WIDTH));
    const top = r.bottom + 4 + height > window.innerHeight ? Math.max(8, r.top - 4 - height) : r.bottom + 4;
    setPos({ top, left });
    return true;
  }

  function toggle() {
    if (!open) place();
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    const close = () => setOpen(false);
    // Follow the button when the page or table scrolls; close once it leaves the screen.
    const follow = () => {
      if (!place()) close();
    };
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        buttonRef.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const els = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
        const i = els.indexOf(document.activeElement);
        els[e.key === "ArrowDown" ? (i + 1) % els.length : (i - 1 + els.length) % els.length]?.focus();
      } else if (e.key === "Tab") {
        close();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, true);
    };
    // place() only reads refs and the item count; re-subscribing on every render is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button ref={buttonRef} type="button" className={`btn-icon ${open ? "active" : ""}`} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle} title="More actions">
        <FiMoreHorizontal />
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} className="row-menu" role="menu" aria-label={label} style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}>
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`row-menu-item ${item.danger ? "danger" : ""}`}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon && <item.icon aria-hidden="true" />}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
