import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext(null);

const ICONS = { success: FiCheckCircle, error: FiAlertCircle, warning: FiAlertTriangle, info: FiInfo };

/** toast.success(msg) / toast.error(msg) / toast.warning(msg) / toast.info(msg) */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info") => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => removeToast(id), type === "error" ? 7000 : 4000);
    },
    [removeToast]
  );

  const api = useMemo(
    () => ({
      addToast,
      success: (m) => addToast(m, "success"),
      error: (m) => addToast(m, "error"),
      warning: (m) => addToast(m, "warning"),
      info: (m) => addToast(m, "info"),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || FiInfo;
          return (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <Icon aria-hidden="true" className="toast-icon" />
              <span className="toast-message">{toast.message}</span>
              <button type="button" className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
                <FiX />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
