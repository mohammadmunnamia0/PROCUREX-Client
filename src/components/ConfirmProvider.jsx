import { createContext, useCallback, useContext, useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Modal from "./Modal";

const ConfirmContext = createContext(null);

/** `await confirm({ title, message, confirmLabel, danger, requireText })` → boolean. Replaces window.confirm. */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => setRequest({ ...options, resolve })), []);

  const finish = (result) => {
    request.resolve(result);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog {...request} onResult={finish} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ title, message, details, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, requireText, onResult }) {
  const [typed, setTyped] = useState("");
  const blocked = Boolean(requireText) && typed.trim() !== requireText;

  return (
    <Modal
      title={title}
      size="sm"
      onClose={() => onResult(false)}
      onSubmit={() => !blocked && onResult(true)}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={() => onResult(false)}>
            {cancelLabel}
          </button>
          <button type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={blocked} data-autofocus={requireText ? undefined : true}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-body">
        {danger && (
          <span className="confirm-icon" aria-hidden="true">
            <FiAlertTriangle />
          </span>
        )}
        <div>
          <p>{message}</p>
          {details && <div className="confirm-details">{details}</div>}
          {requireText && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label htmlFor="confirm-text">
                Type <strong>{requireText}</strong> to confirm
              </label>
              <input id="confirm-text" className="form-control" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" data-autofocus />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
