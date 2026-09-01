const fs = require('fs');

let content = fs.readFileSync('src/utils/i18n.ts', 'utf8');

const newFormatCurrency = `
export let EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  CRC: 510,
  EUR: 0.92,
  GBP: 0.78,
  CAD: 1.36,
};

export async function fetchExchangeRates() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.rates) {
      EXCHANGE_RATES = { ...EXCHANGE_RATES, ...data.rates };
      window.dispatchEvent(new Event('exchangeRatesUpdated'));
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates', error);
  }
}

export function formatCurrency(amountUSD: number, currency: Currency = 'USD'): string {
  const rate = EXCHANGE_RATES[currency] || 1;
  const amount = amountUSD * rate;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is not supported by Intl
    return \`\${currency} \${amount.toFixed(0)}\`;
  }
}
`;

content = content.replace(/export function formatCurrency[\s\S]*$/, newFormatCurrency);

fs.writeFileSync('src/utils/i18n.ts', content);
console.log('patched i18n.ts');
