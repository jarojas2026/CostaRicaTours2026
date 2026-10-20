// ISO 3166-1 alpha-2 country list and helpers for the searchable country selector.
// Names are localized at runtime with Intl.DisplayNames (no extra dependency).
export const ISO_COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

/** Common picks shown first (Costa Rica, then main source markets). */
export const COMMON_COUNTRY_CODES = ['CR', 'US', 'CA', 'MX', 'ES', 'PA', 'NI', 'DE', 'FR', 'GB'];

export type CountryOption = { code: string; name: string; flag: string; common: boolean };

export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function countryName(code: string, language: string): string {
  try {
    const names = new Intl.DisplayNames([language === 'es' ? 'es' : 'en'], { type: 'region' });
    return names.of(code) || code;
  } catch {
    return code;
  }
}

export function buildCountryOptions(language: string): CountryOption[] {
  const locale = language === 'es' ? 'es' : 'en';
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([locale], { type: 'region' }); } catch { names = null; }
  const toOption = (code: string, common: boolean): CountryOption => ({
    code, common, flag: flagEmoji(code), name: names?.of(code) || code
  });
  const common = COMMON_COUNTRY_CODES.map(c => toOption(c, true));
  const rest = ISO_COUNTRY_CODES.filter(c => !COMMON_COUNTRY_CODES.includes(c))
    .map(c => toOption(c, false))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return [...common, ...rest];
}

/** Filters by localized name or ISO code, accent-insensitive. Prefix matches first. */
export function filterCountryOptions(options: CountryOption[], query: string): CountryOption[] {
  const q = normalizeSearch(query);
  if (!q) return options;
  const scored: Array<[number, CountryOption]> = [];
  for (const option of options) {
    const name = normalizeSearch(option.name);
    const code = option.code.toLowerCase();
    let score = -1;
    if (code === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.split(/[\s-]+/).some(w => w.startsWith(q))) score = 2;
    else if (name.includes(q)) score = 3;
    if (score >= 0) scored.push([score, option]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, o]) => o);
}
