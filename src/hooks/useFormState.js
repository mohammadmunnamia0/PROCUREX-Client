import { useCallback, useId, useMemo, useRef, useState } from "react";

/**
 * Small form helper: values, field errors, dirty tracking and input binding.
 * `bind(name)` returns the props for an <input>/<select>/<textarea> including
 * accessible error wiring (aria-invalid / aria-describedby).
 */
export function useFormState(initialValues) {
  const prefix = useId().replace(/:/g, "");
  const [values, setValues] = useState(initialValues); // value or lazy initialiser
  const [errors, setErrors] = useState({});
  const initialJson = useRef(null);
  if (initialJson.current === null) initialJson.current = JSON.stringify(values);

  const isDirty = useMemo(() => JSON.stringify(values) !== initialJson.current, [values]);

  /** Clears the error for `key` and any nested keys ("items" also clears "items.0.quantity"). */
  const clearError = useCallback((key) => {
    setErrors((prev) => {
      const stale = Object.keys(prev).filter((k) => k === key || k.startsWith(`${key}.`));
      if (stale.length === 0) return prev;
      const next = { ...prev };
      stale.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const setField = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      clearError(name);
    },
    [clearError]
  );

  const fieldId = useCallback((name) => `${prefix}-${name.replace(/\./g, "-")}`, [prefix]);

  const bind = (name) => ({
    id: fieldId(name),
    name,
    value: values[name] ?? "",
    onChange: (e) => setField(name, e.target.value),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${fieldId(name)}-error` : undefined,
    className: `form-control${errors[name] ? " is-invalid" : ""}`,
  });

  /** Show errors and move focus to the first invalid field. */
  const showErrors = useCallback(
    (nextErrors) => {
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      if (first) {
        requestAnimationFrame(() => document.getElementById(fieldId(first))?.focus());
      }
    },
    [fieldId]
  );

  return { values, setValues, setField, errors, setErrors, showErrors, clearError, isDirty, bind, fieldId };
}
