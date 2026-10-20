import { useMemo } from "react";
import { useProcurement } from "../store/ProcurementContext";
import { formatCurrency, formatCurrencyCompact } from "../utils/format";

/** Currency formatters bound to the currency chosen in Settings. */
export function useFormatters() {
  const { data } = useProcurement();
  const currency = data.settings.currency;
  return useMemo(
    () => ({
      currency,
      money: (v) => formatCurrency(v, currency),
      moneyCompact: (v) => formatCurrencyCompact(v, currency),
    }),
    [currency]
  );
}
