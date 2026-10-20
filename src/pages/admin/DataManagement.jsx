import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiDatabase, FiDownload, FiLayers, FiPlayCircle, FiRefreshCw, FiRotateCcw, FiTrash2, FiUpload } from "react-icons/fi";
import { Field, PageHeader } from "../../components/ui";
import { useConfirm } from "../../components/ConfirmProvider";
import { useToast } from "../../components/ToastProvider";
import { useProcurement } from "../../store/ProcurementContext";
import { useFormState } from "../../hooks/useFormState";
import { CURRENCIES } from "../../store/schema";
import { countSampleRecords } from "../../store/sampleData";
import { recordCounts } from "../../store/normalize";
import { categoriesCsv, purchaseOrdersCsv, requisitionsCsv, suppliersCsv } from "../../utils/csv";
import { downloadCsv, downloadFile, downloadJson } from "../../utils/download";
import { formatDateTime, todayISO } from "../../utils/dates";
import { formatBytes } from "../../utils/format";

const STORAGE_BUDGET = 5 * 1024 * 1024; // typical per-site localStorage limit

function CountsList({ counts }) {
  return (
    <ul className="counts-list">
      <li><strong>{counts.suppliers}</strong> suppliers</li>
      <li><strong>{counts.requisitions}</strong> requisitions</li>
      <li><strong>{counts.purchaseOrders}</strong> purchase orders</li>
      <li><strong>{counts.categories}</strong> categories</li>
    </ul>
  );
}

function SettingsForm() {
  const { data, actions } = useProcurement();
  const toast = useToast();
  const form = useFormState({ ...data.settings });

  function submit(e) {
    e.preventDefault();
    const result = actions.saveSettings(form.values);
    if (!result.ok) {
      form.showErrors(result.errors || {});
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved.");
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-row-3">
        <Field label="Organisation name" id={form.fieldId("organizationName")} error={form.errors.organizationName}>
          <input {...form.bind("organizationName")} maxLength={80} />
        </Field>
        <Field label="Currency" id={form.fieldId("currency")} error={form.errors.currency} hint="Display only; amounts are not converted">
          <select {...form.bind("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Your name" id={form.fieldId("userName")} error={form.errors.userName} hint="Pre-fills requester, approver and receiver fields">
          <input {...form.bind("userName")} maxLength={80} autoComplete="name" />
        </Field>
      </div>
      <button type="submit" className="btn btn-primary" disabled={!form.isDirty}>
        Save settings
      </button>
    </form>
  );
}

export default function DataManagement() {
  const { data, saveState, snapshot, dataOps } = useProcurement();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInput = useRef(null);
  const [preview, setPreview] = useState(null);
  const counts = recordCounts(data);
  const usage = dataOps.usage();
  const date = todayISO();

  function exportJson() {
    downloadJson(`procurex-backup-${date}.json`, dataOps.exportDocument());
    toast.success("Backup downloaded. Keep it somewhere safe.");
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
      toast.error("Please choose a .json backup file exported from PROCUREX.");
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      toast.error("The file could not be read.");
      return;
    }
    const parsed = dataOps.parseBackup(text);
    if (!parsed.ok) {
      toast.error(parsed.error);
      setPreview({ error: parsed.error, fileName: file.name });
      return;
    }
    setPreview({ ...parsed, fileName: file.name, counts: recordCounts(parsed.data) });
  }

  async function confirmImport() {
    const ok = await confirm({
      title: "Replace current data?",
      message: `All data in this browser will be replaced with the contents of "${preview.fileName}". A snapshot of the current data is kept so you can restore it.`,
      confirmLabel: "Replace data",
      danger: true,
    });
    if (!ok) return;
    const result = dataOps.importData(preview.data);
    setPreview(null);
    toast.success("Backup imported. All dashboards have been updated.");
    if (!result.snapshotSaved) toast.warning("The previous data could not be kept as a snapshot (storage is full or unavailable).");
  }

  async function restore() {
    const ok = await confirm({
      title: "Restore previous data?",
      message: `Current data will be replaced with the snapshot taken before the last ${snapshot.reason} (${formatDateTime(snapshot.at)}).`,
      confirmLabel: "Restore",
      danger: true,
    });
    if (!ok) return;
    const result = dataOps.restoreSnapshot();
    if (result.ok) toast.success("Previous data restored.");
    else toast.error(result.error);
  }

  async function reset() {
    const ok = await confirm({
      title: "Reset all local data?",
      message: "This deletes every supplier, requisition, purchase order and custom category stored in this browser, and restores the default categories.",
      details: <p className="muted">A snapshot is kept so you can undo this with "Restore previous data". Export a backup first if you want a permanent copy.</p>,
      confirmLabel: "Reset all data",
      danger: true,
      requireText: "RESET",
    });
    if (!ok) return;
    const result = dataOps.resetData();
    toast.success("All local data has been reset.");
    if (!result.snapshotSaved) toast.warning("No snapshot could be kept (storage is full or unavailable).");
  }

  // ----- Sample data: added next to the user's records; removal never touches them -----
  async function loadSample() {
    const ok = await confirm({
      title: "Load sample data?",
      message:
        "Adds one year of demo procurement data (13 suppliers, about 100 requisitions and 120 purchase orders) next to your own records. Nothing you entered is changed, and every demo record is marked Sample.",
      confirmLabel: "Load sample data",
    });
    if (!ok) return;
    const result = dataOps.loadSampleData();
    if (result.ok) toast.success(`Sample data loaded: ${result.counts.purchaseOrders} purchase orders over the last 12 months.`);
    else toast.error(result.error);
  }

  async function reloadSample() {
    const ok = await confirm({
      title: "Reload sample data?",
      message: "Replaces the current demo records with a fresh copy dated up to today. Changes you made to sample records are discarded; your own records are not affected.",
      confirmLabel: "Reload sample data",
    });
    if (!ok) return;
    const result = dataOps.reloadSampleData();
    if (result.ok) toast.success("Sample data reloaded with current dates.");
    else toast.error(result.error);
  }

  async function removeSample() {
    const ok = await confirm({
      title: "Remove sample data?",
      message: "Deletes every record marked Sample. Your own suppliers, requisitions and purchase orders stay exactly as they are.",
      details: <p className="muted">A snapshot is kept, so you can undo this with "Restore previous data".</p>,
      confirmLabel: "Remove sample data",
      danger: true,
    });
    if (!ok) return;
    const result = dataOps.removeSampleData();
    if (!result.ok) return toast.error(result.error);
    toast.success(`Removed ${result.removed.purchaseOrders} sample purchase orders and ${result.removed.requisitions} requisitions.`);
    if (result.kept) toast.info(`${result.kept} sample record${result.kept === 1 ? " was" : "s were"} kept because your own records use ${result.kept === 1 ? "it" : "them"}.`);
  }

  const sample = countSampleRecords(data);
  const sampleLoaded = sample.purchaseOrders > 0;
  const userCounts = {
    suppliers: data.suppliers.length - sample.suppliers,
    requisitions: data.requisitions.length - sample.requisitions,
    purchaseOrders: data.purchaseOrders.length - sample.purchaseOrders,
  };
  const corrupt = dataOps.readCorrupt();
  const snapshotCounts = snapshot?.document
    ? {
        suppliers: snapshot.document.suppliers?.length || 0,
        requisitions: snapshot.document.requisitions?.length || 0,
        purchaseOrders: snapshot.document.purchaseOrders?.length || 0,
        categories: snapshot.document.categories?.length || 0,
      }
    : null;

  return (
    <div>
      <PageHeader title="Data & Backup" description="Sample data, settings, backup, import and reset for the data stored in this browser." />
      <ScrollToSection />

      <section className={`card sample-card ${sampleLoaded ? "is-loaded" : ""}`} id="sample-section" aria-labelledby="sample">
        <div className="card-header">
          <div>
            <h3 id="sample">
              <FiLayers aria-hidden="true" /> Sample data
            </h3>
            <p className="card-subtitle">One year of realistic demo procurement data, kept separate from your own records</p>
          </div>
          {sampleLoaded ? <span className="badge badge-sample">Loaded</span> : <span className="badge badge-gray">Not loaded</span>}
        </div>
        {sampleLoaded ? (
          <>
            <ul className="counts-list sample-counts">
              <li>
                <strong>{sample.purchaseOrders}</strong> sample purchase orders
              </li>
              <li>
                <strong>{sample.requisitions}</strong> sample requisitions
              </li>
              <li>
                <strong>{sample.suppliers}</strong> sample suppliers
              </li>
              <li>
                <strong>{userCounts.purchaseOrders + userCounts.requisitions + userCounts.suppliers}</strong> of your own records
              </li>
            </ul>
            <p className="muted small">
              {data.settings.sampleLoadedAt ? `Generated ${formatDateTime(data.settings.sampleLoadedAt)}. ` : ""}Reload to bring the demo dates up to today. Removing sample data never deletes records you created; sample suppliers or requisitions that your own orders use are kept.
            </p>
            <div className="button-group">
              <button type="button" className="btn btn-outline" onClick={reloadSample}>
                <FiRefreshCw /> Reload sample data
              </button>
              <button type="button" className="btn btn-outline danger-text" onClick={removeSample}>
                <FiTrash2 /> Remove sample data
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Adds 13 suppliers, about 100 requisitions and 120 purchase orders spread over the last 12 months, with a realistic mix of delivered, in-transit, delayed, pending, approved and cancelled orders. It is added next to your own records (nothing is replaced) and every demo record is marked{" "}
              <span className="badge badge-sample">Sample</span>.
            </p>
            <div className="button-group">
              <button type="button" className="btn btn-primary" onClick={loadSample}>
                <FiPlayCircle /> Load sample data
              </button>
            </div>
          </>
        )}
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="storage-status">
          <div className="card-header">
            <h3 id="storage-status">Storage</h3>
            {saveState.status !== "saved" && (
              <span className="save-status error">{saveState.status === "unavailable" ? "Storage unavailable" : "Not saving"}</span>
            )}
          </div>
          <CountsList counts={counts} />
          <div className="meter" aria-hidden="true">
            <div className="meter-fill" style={{ width: `${Math.min(100, (usage / STORAGE_BUDGET) * 100)}%` }} />
          </div>
          <p className="muted small">
            About {formatBytes(usage)} used of the ~5 MB browser storage available to this site.
          </p>
          <div className="alert alert-warning small">
            <FiAlertTriangle aria-hidden="true" />
            <span>
              Data is stored only in <strong>this browser on this device</strong>. It is not shared with other browsers, devices or users, and clearing browsing data or using a private window can delete it. Export backups regularly.
            </span>
          </div>
        </section>

        <section className="card" aria-labelledby="backup">
          <div className="card-header">
            <h3 id="backup">Backup & export</h3>
          </div>
          <p className="muted">A JSON backup contains everything and can be imported again later or in another browser.</p>
          <button type="button" className="btn btn-primary" onClick={exportJson}>
            <FiDownload /> Export full backup (JSON)
          </button>
          <p className="muted small" style={{ marginTop: 16 }}>CSV files open in Excel or Google Sheets (export only):</p>
          <div className="button-group">
            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCsv(`procurex-purchase-orders-${date}.csv`, purchaseOrdersCsv(data))} disabled={!data.purchaseOrders.length}>
              <FiDownload /> Purchase orders
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCsv(`procurex-requisitions-${date}.csv`, requisitionsCsv(data))} disabled={!data.requisitions.length}>
              <FiDownload /> Requisitions
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCsv(`procurex-suppliers-${date}.csv`, suppliersCsv(data))} disabled={!data.suppliers.length}>
              <FiDownload /> Suppliers
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCsv(`procurex-categories-${date}.csv`, categoriesCsv(data))} disabled={!data.categories.length}>
              <FiDownload /> Categories
            </button>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="import">
          <div className="card-header">
            <h3 id="import">Import backup</h3>
          </div>
          <p className="muted">Restore a JSON backup exported from PROCUREX. You will see a preview before anything is replaced.</p>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={onFileChosen} className="sr-only" id="import-file" />
          <button type="button" className="btn btn-outline" onClick={() => fileInput.current?.click()}>
            <FiUpload /> Choose backup file…
          </button>
          {preview?.error && (
            <div className="alert alert-danger" role="alert" style={{ marginTop: 12 }}>
              <span>
                <strong>{preview.fileName}</strong>: {preview.error}
              </span>
            </div>
          )}
          {preview?.ok && (
            <div className="import-preview">
              <p>
                <strong>{preview.fileName}</strong>
                {preview.meta.savedAt ? ` · saved ${formatDateTime(preview.meta.savedAt)}` : ""}
              </p>
              <CountsList counts={preview.counts} />
              {preview.warnings.length > 0 && (
                <ul className="warning-list">
                  {preview.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <div className="button-group">
                <button type="button" className="btn btn-danger" onClick={confirmImport}>
                  Replace current data
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setPreview(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="restore">
          <div className="card-header">
            <h3 id="restore">Restore previous data</h3>
          </div>
          {snapshot ? (
            <>
              <p className="muted">
                Snapshot taken before the last <strong>{snapshot.reason}</strong> on {formatDateTime(snapshot.at)}:
              </p>
              {snapshotCounts && <CountsList counts={snapshotCounts} />}
              <button type="button" className="btn btn-outline" onClick={restore}>
                <FiRotateCcw /> Restore this snapshot
              </button>
            </>
          ) : (
            <p className="muted">No snapshot yet. One is saved automatically before every import or reset.</p>
          )}
          {corrupt && (
            <div className="alert alert-warning small" style={{ marginTop: 12 }}>
              <span>Unreadable data from an earlier session was kept for manual recovery.</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => downloadFile(`procurex-unreadable-data-${date}.txt`, corrupt, "text/plain")}>
                <FiDownload /> Download
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="settings">
        <div className="card-header">
          <h3 id="settings">Settings</h3>
        </div>
        {/* Remount when settings change (own save, import, other tab) so the form never shows stale values. */}
        <SettingsForm key={JSON.stringify(data.settings)} />
      </section>

      <section className="card danger-zone" aria-labelledby="reset">
        <div className="card-header">
          <h3 id="reset">
            <FiDatabase aria-hidden="true" /> Reset local data
          </h3>
        </div>
        <p className="muted">Permanently delete all records stored in this browser (your own and sample data) and start again, empty, with the default categories.</p>
        <button type="button" className="btn btn-danger" onClick={reset}>
          <FiTrash2 /> Reset all local data…
        </button>
      </section>
    </div>
  );
}

/** Scrolls to the sample-data card when opened via "Manage sample data" (?section=sample). */
function ScrollToSection() {
  const [params] = useSearchParams();
  const section = params.get("section");
  useEffect(() => {
    if (section === "sample") document.getElementById("sample-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);
  return null;
}
