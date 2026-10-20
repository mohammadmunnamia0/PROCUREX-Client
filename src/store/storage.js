// localStorage adapter (SRS §9, §11). The backend is injected so the adapter can be
// tested with an in-memory fake, including one that throws like a full or blocked
// browser storage.
import { STORAGE_KEYS, createInitialData } from "./schema.js";
import { normalizeData, toDocument } from "./normalize.js";
import { reducer } from "./reducer.js";
import { describeSample, generateSampleData } from "./sampleData.js";

export function getBrowserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Accessing localStorage itself throws when site data is blocked.
    return null;
  }
}

export function describeStorageError(error) {
  const name = error?.name || "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || error?.code === 22) {
    return "Browser storage is full (quota exceeded). Export a backup and free some space.";
  }
  if (name === "SecurityError") return "Browser storage is blocked by your browser's privacy settings.";
  return `Browser storage error: ${error?.message || "unknown error"}.`;
}

export function createStorage(backend) {
  function isAvailable() {
    if (!backend) return false;
    try {
      const probe = "procurex:probe";
      backend.setItem(probe, "1");
      backend.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  function read(key) {
    try {
      return backend ? backend.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function write(key, value) {
    if (!backend) return { ok: false, error: "Browser storage is not available in this browser." };
    try {
      backend.setItem(key, value);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describeStorageError(error) };
    }
  }

  function removeKey(key) {
    try {
      backend?.removeItem(key);
    } catch {
      // ignore
    }
  }

  return {
    isAvailable,
    readData: () => read(STORAGE_KEYS.data),

    /** Serialises and writes the whole document. */
    save(data, savedAt) {
      const json = JSON.stringify(toDocument(data, savedAt));
      const result = write(STORAGE_KEYS.data, json);
      return { ...result, bytes: json.length, savedAt };
    },

    saveSnapshot(data, reason, at) {
      return write(STORAGE_KEYS.snapshot, JSON.stringify({ at, reason, document: toDocument(data, at) }));
    },
    readSnapshot() {
      const raw = read(STORAGE_KEYS.snapshot);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && parsed.document ? parsed : null;
      } catch {
        return null;
      }
    },
    clearSnapshot: () => removeKey(STORAGE_KEYS.snapshot),

    saveCorrupt: (raw) => write(STORAGE_KEYS.corrupt, raw),
    readCorrupt: () => read(STORAGE_KEYS.corrupt),
    clearCorrupt: () => removeKey(STORAGE_KEYS.corrupt),

    /** Approximate bytes used by this app's keys (UTF-16 → ×2). */
    usage() {
      return Object.values(STORAGE_KEYS).reduce((sum, key) => sum + (read(key)?.length || 0) * 2, 0);
    },
  };
}

/** First-run document: default categories plus, optionally, the flagged sample dataset. */
export function createFirstRunData(env, { seedSample = false } = {}) {
  const initial = createInitialData(env);
  if (!seedSample) return initial;
  const sample = generateSampleData({ today: env.today(), now: env.now(), makeId: env.makeId, existing: initial });
  return reducer(initial, {
    type: "sample/load",
    sample,
    loadedAt: env.now(),
    message: `Sample data loaded on first visit: ${describeSample(sample)}`,
    meta: { at: env.now(), activityId: env.makeId() },
  });
}

/**
 * Startup load sequence (SRS §9.4). Only a browser with no saved data at all gets
 * the first-run document (with sample data when `seedSample`); saved data is never replaced.
 * @returns {{ data, status: 'new'|'ok'|'repaired'|'corrupt'|'unavailable', warnings: string[], needsSave: boolean }}
 */
export function loadInitialData(storage, env, options = {}) {
  if (!storage.isAvailable()) {
    return { data: createFirstRunData(env, options), status: "unavailable", warnings: [], needsSave: false };
  }
  const raw = storage.readData();
  if (raw === null || raw === "") {
    return { data: createFirstRunData(env, options), status: "new", warnings: [], needsSave: true };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    // Keep the unreadable text so it can be recovered manually; start fresh.
    // If even the recovery copy cannot be written, do not overwrite the original
    // until the user makes a change (the raw text is also kept in memory).
    const kept = storage.saveCorrupt(raw);
    return {
      data: createInitialData(env),
      status: "corrupt",
      corruptRaw: raw,
      warnings: [
        "Saved data could not be read, so PROCUREX started with empty data. The unreadable data was kept; use \"Download unreadable data\" to recover it manually.",
      ],
      needsSave: kept.ok,
    };
  }
  const { data, warnings } = normalizeData(parsed, env);
  return { data, status: warnings.length ? "repaired" : "ok", warnings, needsSave: warnings.length > 0 };
}
