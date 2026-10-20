import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { useConfirm } from "./ConfirmProvider";
import { useBeforeUnload } from "../hooks/useBeforeUnload";

// Stack of open dialogs so Escape / focus trapping only act on the top one.
const stack = [];
let nextKey = 0;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog. When `isDirty` is true, closing (Escape, ✕, backdrop,
 * Cancel via `requestClose`) asks before discarding changes.
 */
export default function Modal({ title, subtitle, onClose, children, footer, size = "md", isDirty = false, onSubmit }) {
  const confirm = useConfirm();
  const titleId = useId();
  const dialogRef = useRef(null);
  const keyRef = useRef(null);
  const latest = useRef({ isDirty, onClose });
  latest.current = { isDirty, onClose };

  useBeforeUnload(isDirty);

  async function requestClose() {
    if (latest.current.isDirty) {
      const discard = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes in this form. Close it without saving?",
        confirmLabel: "Discard changes",
        cancelLabel: "Keep editing",
        danger: true,
      });
      if (!discard) return;
    }
    latest.current.onClose();
  }
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    keyRef.current = ++nextKey;
    stack.push(keyRef.current);
    const previouslyFocused = document.activeElement;
    const node = dialogRef.current;
    const first = node.querySelector("[data-autofocus]") || node.querySelector(`.modal-body ${FOCUSABLE}`) || node;
    first.focus();
    document.body.classList.add("modal-open");

    function onKeyDown(e) {
      if (stack[stack.length - 1] !== keyRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        requestCloseRef.current();
      } else if (e.key === "Tab") {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const i = stack.indexOf(keyRef.current);
      if (i !== -1) stack.splice(i, 1);
      if (stack.length === 0) document.body.classList.remove("modal-open");
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
    };
  }, []);

  const Container = onSubmit ? "form" : "div";
  const containerProps = onSubmit
    ? { onSubmit: (e) => { e.preventDefault(); onSubmit(e); }, noValidate: true }
    : {};

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} tabIndex={-1}>
        <Container className="modal-inner" {...containerProps}>
          <div className="modal-header">
            <div>
              <h3 id={titleId}>{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            <button type="button" className="btn-icon modal-close" onClick={requestClose} aria-label="Close dialog">
              <FiX />
            </button>
          </div>
          <div className="modal-body">{typeof children === "function" ? children({ requestClose }) : children}</div>
          {footer && <div className="modal-footer">{typeof footer === "function" ? footer({ requestClose }) : footer}</div>}
        </Container>
      </div>
    </div>,
    document.body
  );
}
