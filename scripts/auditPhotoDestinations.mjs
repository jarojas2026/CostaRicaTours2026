#!/usr/bin/env node
/**
 * Auditoría local de nombres de archivo y destino declarado en photoManifest.json.
 * No descarga fotos ni modifica el catálogo. Genera CSV para revisión humana.
 * Uso: node scripts/auditPhotoDestinations.mjs [ruta-csv]
 */
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('src/data/photoManifest.json');
const outputPath = path.resolve(process.argv[2] || 'reports/photo-destination-audit.csv');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const normalize = (value) => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const decode = (value) => { try { return decodeURIComponent(value); } catch { return value; } };
const basename = (value) => decode(String(value || '').split(/[/?#]/).filter(Boolean).pop() || '');
const filenameFromUrl = (url) => basename(new URL(url).pathname).replace(/^\d+px-/, '');
const filenameFromSourcePage = (url) => {
  const match = decode(String(url || '').match(/\/wiki\/File:(.+)$/)?.[1] || '');
  return match.replace(/_/g, ' ');
};
const sameFilename = (a, b) => normalize(a).replace(/\.(jpe?g|png|webp|gif|svg)$/i, '') === normalize(b).replace(/\.(jpe?g|png|webp|gif|svg)$/i, '');

const foreignPlaces = [
  'Yellowstone', 'Yosemite', 'Grand Canyon', 'Hawaii', 'Bali', 'Thailand', 'Phuket',
  'Cancun', 'Machu Picchu', 'Amazonas', 'Galapagos', 'Galápagos', 'Iguazu', 'Iguazú',
  'Patagonia', 'Alaska', 'Florida', 'New York', 'Paris', 'London', 'Rome', 'Venice',
  'Barcelona', 'Santorini', 'Dubai', 'Maldives', 'Seychelles', 'Fiji', 'Zanzibar',
  'Mexico', 'Colombia', 'Peru', 'Brasil', 'Brazil', 'Argentina', 'Chile', 'Ecuador'
];
const costaRicaPlaces = [
  'Costa Rica', 'Arenal', 'La Fortuna', 'Monteverde', 'Manuel Antonio', 'Tortuguero',
  'Tamarindo', 'Langosta', 'Corcovado', 'Poas', 'Poás', 'Carara', 'Cahuita',
  'Puerto Viejo', 'Guanacaste', 'Osa', 'Rio Celeste', 'Río Celeste', 'La Paz',
  'Uvita', 'Ballena', 'Dominical', 'Turrialba', 'Pacuare', 'Sarapiqui', 'Sarapiquí',
  'Sarchi', 'Sarchí', 'Grecia', 'Cartago', 'San Jose', 'San José', 'Dota', 'Los Santos',
  'Golfito', 'Pavones', 'Nicoya', 'Nosara', 'Samara', 'Sámara', 'Papagayo', 'Jaco', 'Jacó'
];
const regionAliases = {
  arenal: 'arenal la fortuna', monteverde: 'monteverde', manuel_antonio: 'manuel antonio',
  tortuguero: 'tortuguero', guanacaste: 'guanacaste tamarindo langosta papagayo nosara nicoya samara',
  osa: 'osa corcovado', corcovado: 'osa corcovado', caribe: 'caribe cahuita puerto viejo',
  caribe_sur: 'caribe cahuita puerto viejo', sjo: 'san jose poas cartago', san_jose: 'san jose poas',
  uvita: 'uvita ballena', marino_ballena: 'uvita ballena', dominical: 'uvita dominical',
  pacuare: 'pacuare turrialba', sarapiqui: 'sarapiqui', los_santos: 'dota los santos',
  golfito: 'golfito pavones', golfo_dulce: 'golfito golfo dulce', cartago: 'cartago poas'
};
const hasPlace = (text, place) => normalize(text).includes(normalize(place));
const csvCell = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

const auditDate = new Date().toISOString().slice(0, 10);
const headers = ['audit_date','key','place','regions','source','source_filename','url_filename','filename_match','destination_mismatch','author','license','license_url','source_page','credit','action'];
const rows = manifest.photos.map(photo => {
  const sourceFilename = filenameFromSourcePage(photo.sourcePage);
  const urlFilename = filenameFromUrl(photo.url);
  const filenameMatch = !sourceFilename || sameFilename(sourceFilename, urlFilename);
  const declared = normalize([photo.place, ...(photo.regions || []).map(region => regionAliases[region] || region), photo.inCostaRica === true ? 'Costa Rica' : ''].join(' '));
  const allNames = normalize([sourceFilename, urlFilename].join(' '));
  const foreignHits = foreignPlaces.filter(place => hasPlace(allNames, place) && !hasPlace(declared, place));
  const knownCRHits = costaRicaPlaces.filter(place => hasPlace(allNames, place));
  const destinationMismatch = foreignHits.length > 0 || knownCRHits.some(place => !hasPlace(declared, place));
  const reasons = [
    !filenameMatch ? 'URL filename differs from Commons source page' : '',
    foreignHits.length ? 'foreign place in filename: ' + foreignHits.join('; ') : '',
    knownCRHits.some(place => !hasPlace(declared, place)) ? 'Costa Rica place in filename differs from declared place/region: ' + knownCRHits.filter(place => !hasPlace(declared, place)).join('; ') : ''
  ].filter(Boolean);
  return [
    auditDate, photo.key, photo.place, (photo.regions || []).join(';'), photo.source, sourceFilename, urlFilename,
    filenameMatch ? 'MATCH' : 'REVIEW', destinationMismatch ? 'REVIEW' : 'NO_SIGNAL',
    photo.author, photo.license, photo.licenseUrl, photo.sourcePage, photo.credit,
    reasons.length ? reasons.join(' | ') : (destinationMismatch ? 'Review filename/destination mapping' : 'No explicit mismatch detected')
  ];
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n') + '\n', 'utf8');
const filenameIssues = rows.filter(row => row[6] === 'REVIEW').length;
const destinationIssues = rows.filter(row => row[7] === 'REVIEW').length;
console.log(`CSV: ${outputPath}\nFotos: ${rows.length}; filename mismatch: ${filenameIssues}; destination mismatch: ${destinationIssues}\nNo se modificó ningún activo ni manifest.`);
