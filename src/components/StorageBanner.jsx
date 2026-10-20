import { FiAlertOctagon, FiAlertTriangle, FiDownload, FiRefreshCw, FiX } from "react-icons/fi";
import { useProcurement } from "../store/ProcurementContext";
import { useToast } from "./ToastProvider";
import { downloadFile, downloadJson } from "../utils/download";
import { todayISO } from "../utils/dates";

/** Global banners for storage problems (SRS §11). Never silent. */
export default function StorageBanner() {
  const { saveState, notice, dismissNotice, dataOps } = useProcurement();
  const toast = useToast();

  const exportBackup = () => downloadJson(`procurex-backup-${todayISO()}.json`, dataOps.exportDocument());

  const retry = () => {
    const result = dataOps.retrySave();
    if (result.ok) toast.success("All changes are now saved in this browser.");
    else toast.error(result.error || "Saving still fails.");
  };

  return (
    <>
      {saveState.status === "unavailable" && (
        <div className="banner banner-danger" role="alert">
          <FiAlertOctagon aria-hidden="true" />
          <div className="banner-text">
            <strong>Browser storage is unavailable.</strong> {saveState.error} You can keep working, but data will be lost when this tab is closed. Export a backup to keep your work.
          </div>
          <div className="banner-actions">
            <button type="button" className="btn btn-sm btn-light" onClick={exportBackup}>
              <FiDownload /> Export backup
            </button>
          </div>
        </div>
      )}
      {saveState.status === "error" && (
        <div className="banner banner-danger" role="alert">
          <FiAlertOctagon aria-hidden="true" />
          <div className="banner-text">
            <strong>Changes are not being saved.</strong> {saveState.error}
          </div>
          <div className="banner-actions">
            <button type="button" className="btn btn-sm btn-light" onClick={retry}>
              <FiRefreshCw /> Retry
            </button>
            <button type="button" className="btn btn-sm btn-light" onClick={exportBackup}>
              <FiDownload /> Export backup
            </button>
          </div>
        </div>
      )}
      {notice && (
        <div className="banner banner-warning" role="alert">
          <FiAlertTriangle aria-hidden="true" />
          <div className="banner-text">
            {notice.messages.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
          <div className="banner-actions">
            {notice.corruptRaw && (
              <button type="button" className="btn btn-sm btn-light" onClick={() => downloadFile(`procurex-unreadable-data-${todayISO()}.txt`, notice.corruptRaw, "text/plain")}>
                <FiDownload /> Download unreadable data
              </button>
            )}
            <button type="button" className="btn-icon" onClick={dismissNotice} aria-label="Dismiss message">
              <FiX />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
