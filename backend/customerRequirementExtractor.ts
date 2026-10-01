export type TravelRequirements = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  childAges?: number[];
  nightlyBudgetUsd?: number;
  breakfast?: boolean;
  parking?: boolean;
  language?: 'es' | 'en';
};

const monthMap: Record<string, number> = {
  enero: 1, january: 1,
  febrero: 2, february: 2,
  marzo: 3, march: 3,
  abril: 4, april: 4,
  mayo: 5, may: 5,
  junio: 6, june: 6,
  julio: 7, july: 7,
  agosto: 8, august: 8,
  septiembre: 9, setiembre: 9, september: 9,
  octubre: 10, october: 10,
  noviembre: 11, november: 11,
  diciembre: 12, december: 12
};

const pad = (value: number) => String(value).padStart(2, '0');

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseDateRange(text: string) {
  const plain = normalize(text);
  const range = plain.match(/(?:del\s+)?(\d{1,2})\s*(?:-|al|a|to)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de)?\s+(20\d{2})/i)
    || plain.match(/(?:from\s+)?(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s+([a-z]+)\s+(20\d{2})/i);
  if (!range) return {};
  const start = Number(range[1]);
  const end = Number(range[2]);
  const month = monthMap[range[3]];
  const year = Number(range[4]);
  if (!month || start < 1 || end < 1 || start > 31 || end > 31) return {};
  return {
    checkIn: `${year}-${pad(month)}-${pad(start)}`,
    checkOut: `${year}-${pad(month)}-${pad(end)}`
  };
}

function parseDestination(text: string) {
  const match = text.match(/(?:en|para|visitar|hospedaje en|hotel en|stay in|hotel in)\s+([A-ZÁÉÍÓÚÑ][^\n,.]{2,60})/i);
  if (!match) return undefined;
  return match[1].replace(/\s+(?:con|para|del|from)\b.*$/i, '').trim();
}

export function extractCustomerTravelRequirements(text: string): TravelRequirements {
  const source = String(text || '').slice(0, 16000);
  const plain = normalize(source);
  const dates = parseDateRange(source);
  const adultsMatch = plain.match(/(\d{1,2})\s+adult(?:o|os|a|as|s)?\b/);
  const childrenMatch = plain.match(/(\d{1,2})\s+(?:nina|nino|ninas|ninos|child|children)\b/);
  const ageMatches = [...plain.matchAll(/(?:nina|nino|child)[^\d]{0,20}(\d{1,2}(?:[.,]\d+)?)\s*(?:anos|ano|years?|yrs?)/g)]
    .map(match => Number(match[1].replace(',', '.')))
    .filter(age => Number.isFinite(age) && age >= 0 && age < 18);
  const budgetMatch = plain.match(/(?:presupuesto|budget)[^$\d]{0,20}\$?\s*(\d{2,5})(?:\s*(?:usd|dolares|dollars?))?(?:\s*(?:por|per)\s+(?:noche|night))?/)
    || plain.match(/\$\s*(\d{2,5})\s*(?:por|per)\s+(?:noche|night)/);

  const result: TravelRequirements = {
    ...dates,
    destination: parseDestination(source),
    adults: adultsMatch ? Number(adultsMatch[1]) : undefined,
    children: childrenMatch ? Number(childrenMatch[1]) : undefined,
    childAges: ageMatches.length ? ageMatches : undefined,
    nightlyBudgetUsd: budgetMatch ? Number(budgetMatch[1]) : undefined,
    breakfast: /(?:desayuno|breakfast)\s+(?:incluido|incluida|included|required|necesario|necesaria)/.test(plain) ? true : undefined,
    parking: /(?:parqueo|estacionamiento|parking)\b/.test(plain) ? true : undefined,
    language: /\b(?:hola|gracias|cotiz|hosped|desayuno|parqueo|nina|nino)\b/.test(plain) ? 'es' : 'en'
  };

  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined)) as TravelRequirements;
}
