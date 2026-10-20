import { FiAlertCircle } from "react-icons/fi";
import { useProcurement } from "../store/ProcurementContext";

/** Shown only when changes are NOT being saved; nothing is rendered while saving works. */
export default function SaveStatus() {
  const { saveState } = useProcurement();
  if (saveState.status === "saved") return null;
  return (
    <span className="save-status error" role="status" title={saveState.error}>
      <FiAlertCircle aria-hidden="true" />
      {saveState.status === "unavailable" ? "Storage unavailable" : "Not saved"}
    </span>
  );
}
