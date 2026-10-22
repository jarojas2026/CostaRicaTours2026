import { useCallback, useEffect, useState } from 'react';
import { getRatesSnapshot, loadExchangeRates, RATES_UPDATED_EVENT } from '../utils/exchangeRates';
import { availableCurrencies, moneyView, type MoneyView, type RatesSnapshot } from '../utils/money';

/** Instantánea de tasas; se re-renderiza cuando llegan tasas nuevas. */
export function useRates(): RatesSnapshot {
  const [rates, setRates] = useState<RatesSnapshot>(getRatesSnapshot);
  useEffect(() => {
    const update = () => setRates(getRatesSnapshot());
    window.addEventListener(RATES_UPDATED_EVENT, update);
    update();
    void loadExchangeRates();
    return () => window.removeEventListener(RATES_UPDATED_EVENT, update);
  }, []);
  return rates;
}

/** Formateador ligado a la moneda/idioma elegidos: `money(125).primary` → "≈ ₡57 193". */
export function useMoney(currency: string, language: string): (amountUSD: number) => MoneyView {
  const rates = useRates();
  return useCallback((amountUSD: number) => moneyView(amountUSD, currency, language, rates), [currency, language, rates]);
}

export function useAvailableCurrencies(): string[] {
  return availableCurrencies(useRates());
}
