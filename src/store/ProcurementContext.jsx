// Single shared store for the whole app (SRS §9.1). Every page reads the same
// `data`, so a change made in the Admin Panel re-renders the dashboard instantly.
// Each committed change is written to localStorage synchronously.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createId } from "../utils/id";
import { todayISO } from "../utils/dates";
import { createActions } from "./actions";
import { reducer } from "./reducer";
import { STORAGE_KEYS, createInitialData, hasTransactionalData } from "./schema";
import { createStorage, getBrowserStorage, loadInitialData } from "./storage";
import { normalizeData, parseBackup, recordCounts, toDocument } from "./normalize";
import { createSampleData } from "./sampleData";

const ProcurementContext = createContext(null);

const env = { makeId: createId, now: () => new Date().toISOString(), today: todayISO };

export function ProcurementProvider({ children }) {
  const storageRef = useRef(null);
  if (!storageRef.current) storageRef.current = createStorage(getBrowserStorage());
  const storage = storageRef.current;

  const [initial] = useState(() => loadInitialData(storage, env));
  const [data, setData] = useState(initial.data);
  const dataRef = useRef(initial.data);

  const [saveState, setSaveState] = useState(() => ({
    status: initial.status === "unavailable" ? "unavailable" : "saved",
    error: initial.status === "unavailable" ? "Browser storage is not available (it may be blocked or disabled)." : "",
    lastSavedAt: null,
    bytes: 0,
  }));
  const [notice, setNotice] = useState(() =>
    initial.warnings.length ? { kind: initial.status, messages: initial.warnings, corruptRaw: initial.corruptRaw || null } : null
  );
  const [snapshot, setSnapshot] = useState(() => storage.readSnapshot());

  const persist = useCallback(
    (next) => {
      if (!storage.isAvailable()) {
        setSaveState((s) => ({ ...s, status: "unavailable", error: "Browser storage is not available (it may be blocked or disabled)." }));
        return { ok: false };
      }
      const result = storage.save(next, new Date().toISOString());
      setSaveState(
        result.ok
          ? { status: "saved", error: "", lastSavedAt: result.savedAt, bytes: result.bytes }
          : (s) => ({ ...s, status: "error", error: result.error })
      );
      return result;
    },
    [storage]
  );

  // Persist once at startup for first runs and repaired data.
  useEffect(() => {
    if (initial.needsSave) persist(dataRef.current);
  }, [initial, persist]);

  /** Apply an action, update every view and save. */
  const commit = useCallback(
    (action) => {
      const next = reducer(dataRef.current, action);
      if (next === dataRef.current) return next;
      dataRef.current = next;
      setData(next);
      if (action.kind !== "sync") persist(next);
      return next;
    },
    [persist]
  );

  const actions = useMemo(() => createActions({ getState: () => dataRef.current, commit, ...env }), [commit]);

  // Cross-tab sync: another tab saved → load its document without writing it back.
  useEffect(() => {
    function onStorage(event) {
      if (event.key === STORAGE_KEYS.snapshot) setSnapshot(storage.readSnapshot());
      if (event.key !== STORAGE_KEYS.data || !event.newValue) return;
      try {
        const { data: synced } = normalizeData(JSON.parse(event.newValue), env);
        commit({ type: "data/replace", kind: "sync", data: synced });
        setSaveState((s) => ({ ...s, status: "saved", error: "", lastSavedAt: new Date().toISOString() }));
      } catch {
        // Ignore malformed writes from other tabs; this tab keeps its data.
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [commit, storage]);

  // Warn before closing the tab while changes are not stored.
  const unsaved = saveState.status !== "saved";
  useEffect(() => {
    if (!unsaved) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  const takeSnapshot = useCallback(
    (reason) => {
      const result = storage.saveSnapshot(dataRef.current, reason, new Date().toISOString());
      setSnapshot(storage.readSnapshot());
      return result.ok;
    },
    [storage]
  );

  const dataOps = useMemo(
    () => ({
      exportDocument: () => toDocument(dataRef.current, new Date().toISOString()),
      parseBackup: (text) => parseBackup(text, env),
      importData(imported) {
        const snapshotSaved = takeSnapshot("import");
        const counts = recordCounts(imported);
        actions.replaceData(imported, {
          label: "Imported",
          message: `Imported backup: ${counts.suppliers} suppliers, ${counts.requisitions} requisitions, ${counts.purchaseOrders} purchase orders`,
        });
        return { ok: true, snapshotSaved };
      },
      restoreSnapshot() {
        const snap = storage.readSnapshot();
        if (!snap) return { ok: false, error: "There is no previous data to restore." };
        const { data: restored } = normalizeData(snap.document, env);
        takeSnapshot("restore");
        actions.replaceData(restored, { label: "Restored", message: `Restored data saved before the last ${snap.reason}` });
        return { ok: true };
      },
      resetData() {
        const snapshotSaved = takeSnapshot("reset");
        actions.resetData(createInitialData(env));
        return { ok: true, snapshotSaved };
      },
      loadSampleData() {
        if (hasTransactionalData(dataRef.current)) return { ok: false, error: "Sample data can only be loaded when there are no suppliers, requisitions or purchase orders." };
        const sample = createSampleData({ base: dataRef.current, makeId: env.makeId, today: env.today() });
        actions.replaceData(sample, { label: "Sample data", message: "Loaded sample data for demonstration" });
        return { ok: true };
      },
      retrySave: () => persist(dataRef.current),
      usage: () => storage.usage(),
      readCorrupt: () => notice?.corruptRaw || storage.readCorrupt(),
    }),
    [actions, notice, persist, storage, takeSnapshot]
  );

  const value = useMemo(
    () => ({ data, actions, saveState, notice, dismissNotice: () => setNotice(null), snapshot, dataOps }),
    [data, actions, saveState, notice, snapshot, dataOps]
  );

  return <ProcurementContext.Provider value={value}>{children}</ProcurementContext.Provider>;
}

export function useProcurement() {
  const ctx = useContext(ProcurementContext);
  if (!ctx) throw new Error("useProcurement must be used inside <ProcurementProvider>");
  return ctx;
}
