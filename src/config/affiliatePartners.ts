/**
 * Enlaces de afiliado de Travelpayouts (proyecto "Costa Rica Tours", source 591707, Sub ID "web").
 * Único lugar donde viven estos enlaces. Se muestran como enlaces simples:
 * sin scripts de terceros ni dependencias. Siempre con rel="sponsored noopener".
 */
import type { MessageKey } from '../i18n';

export interface AffiliatePartner {
  id: string;
  name: string;
  url: string;
  descriptionKey: MessageKey;
}

export const AFFILIATE_LINK_REL = 'sponsored noopener';

export const AFFILIATE_PARTNERS: readonly AffiliatePartner[] = [
  { id: 'klook', name: 'Klook', url: 'https://klook.tpk.lu/R2xR6fq7', descriptionKey: 'partners.klook' },
  { id: 'tiqets', name: 'Tiqets', url: 'https://tiqets.tpk.lu/3jHn1cXn', descriptionKey: 'partners.tiqets' },
  { id: 'kiwitaxi', name: 'Kiwitaxi', url: 'https://kiwitaxi.tpk.lu/F6wgQjwN', descriptionKey: 'partners.kiwitaxi' },
  { id: 'localrent', name: 'Localrent', url: 'https://localrent.tpk.lu/ohD0r1Ec', descriptionKey: 'partners.localrent' },
  { id: 'welcome-pickups', name: 'Welcome Pickups', url: 'https://tpk.lu/xDa8SDdw', descriptionKey: 'partners.welcomePickups' },
] as const;
