import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { TRAVEL_GUIDES } from '../src/data/travelKnowledge';
import { DEFAULT_PREPARATION, civilDay, costaRicaDate, tripTiming, preparationTasks, packingTasks, preparationTopics, preparationContext, preparationHref, preparationCalendar, preparationBrief, type PreparationProfile } from '../src/utils/tripPreparation';

const today='2026-10-26';
const profile:PreparationProfile={...DEFAULT_PREPARATION,region:'monteverde',activity:'hiking',startDate:'2026-11-20',endDate:'2026-11-25'};
const taskIds=(p:PreparationProfile,date=today)=>preparationTasks(p,date).map(t=>t.id);
const packingIds=(p:PreparationProfile)=>packingTasks(p).map(t=>t.id);

test('strict civil dates reject calendar rollover, missing padding and invalid leap days',()=>{
  for(const bad of ['2026-02-29','2026-04-31','2026-13-01','2026-00-01','2026-11-00','2026-1-02','2026-11-02T00:00Z','10000-01-01',''])assert.equal(civilDay(bad),null,bad);
  assert.notEqual(civilDay('2028-02-29'),null);
  assert.equal(civilDay('2028-03-01')!-civilDay('2028-02-29')!,1);
});
test('Costa Rica date changes at 06:00 UTC, not host midnight',()=>{
  assert.equal(costaRicaDate(new Date('2026-10-27T05:59:59Z')),'2026-10-26');
  assert.equal(costaRicaDate(new Date('2026-10-27T06:00:00Z')),'2026-10-27');
});
test('countdown uses civil days consistently and distinguishes completed from ongoing travel',()=>{
  assert.deepEqual(tripTiming('2026-10-27','2026-11-02',today),{phase:'upcoming',countdown:1,day:null});
  assert.deepEqual(tripTiming(today,today,today),{phase:'today',countdown:0,day:1});
  assert.deepEqual(tripTiming('2026-10-25','2026-10-27',today),{phase:'during',countdown:-1,day:2});
  assert.equal(tripTiming('2026-10-20','2026-10-25',today).phase,'completed');
  assert.equal(tripTiming('2026-10-20','',today).phase,'return_unknown');
  assert.equal(tripTiming('','',today).phase,'undated');
});
test('invalid or reversed trip dates never produce an active trip',()=>{
  for(const [start,end]of [['2026-02-29',''],['2026-10-28','2026-10-27'],['2026-10-28','no date']])assert.equal(tripTiming(start,end,today).phase,'invalid');
});
test('region, activity and participant needs change the suggested preparation',()=>{
  assert.ok(taskIds(profile).includes('park-access'));
  assert.ok(taskIds(profile).includes('layers'));
  const rafting={...profile,region:'pacuare' as const,activity:'rafting' as const,family:true,accessibility:true};
  for(const id of ['requirements','water-gear','family','access'])assert.ok(taskIds(rafting).includes(id),id);
  assert.ok(!taskIds(rafting).includes('layers'));
  assert.ok(taskIds({...profile,region:'tortuguero'}).includes('remote'));
});
test('packing responds to terrain and water without prechecking any item',()=>{
  assert.ok(packingIds(profile).includes('pack-layer'));
  assert.ok(packingIds(profile).includes('pack-shoes'));
  assert.ok(packingIds({...profile,region:'pacuare',activity:'rafting'}).includes('pack-drybag'));
  assert.ok(!packingIds({...profile,region:'pacuare',activity:'rafting'}).includes('pack-layer'));
  assert.ok(!preparationBrief(profile,{},'es',today).includes('[x]'));
});
test('preparation changes near departure, during travel and after the end date',()=>{
  assert.ok(taskIds(profile,'2026-11-14').includes('departure-week'));
  assert.ok(taskIds(profile,'2026-11-20').includes('daily-plan-2026-11-20'));
  const firstDay=taskIds(profile,'2026-11-20').find(id=>id.startsWith('daily-plan-'))!;
  const secondDay=taskIds(profile,'2026-11-21').find(id=>id.startsWith('daily-plan-'))!;
  const checked={[preparationContext(profile)+'|'+firstDay]:true};
  assert.notEqual(firstDay,secondDay);
  assert.equal(checked[preparationContext(profile)+'|'+secondDay],undefined);
  assert.ok(taskIds(profile,'2026-11-21').includes('park-access'));
  assert.deepEqual(taskIds(profile,'2026-11-26'),['trip-record','trip-expenses']);
  assert.ok(!taskIds(profile,today).includes('departure-week'));
});
test('completion stays isolated by dates, region, activity and needs; the earlier context is recoverable',()=>{
  const original=preparationContext(profile);
  const saved={[original+'|weather']:true};
  for(const change of [{startDate:'2026-11-21'},{endDate:'2026-11-26'},{region:'osa' as const},{activity:'rafting' as const},{family:true},{accessibility:true}])assert.equal(saved[preparationContext({...profile,...change})+'|weather'],undefined);
  assert.equal(saved[preparationContext({...profile})+'|weather'],true);
});
test('public navigation accepts only catalog region/activity IDs and excludes personal state',()=>{
  assert.equal(preparationHref('monteverde','hiking'),'/trip?region=monteverde&activity=hiking');
  assert.equal(preparationHref('a person','a private note'),'/trip');
  assert.equal(preparationHref('https://bad.test','rafting'),'/trip?activity=rafting');
  assert.equal(preparationHref('all','all'),'/trip');
});
test('all recommended topics resolve to complete bilingual guidance with official source references',()=>{
  assert.equal(new Set(TRAVEL_GUIDES.map(g=>g.id)).size,12);
  for(const g of TRAVEL_GUIDES){assert.match(g.sourceLabel,/ICT|SINAC|IMN|BCCR/);for(const lang of ['es','en']as const){assert.ok(g.title[lang]);assert.ok(g.summary[lang]);assert.equal(g.steps[lang].length,3);}}
  for(const topic of preparationTopics({...profile,family:true,accessibility:true},today))assert.ok(TRAVEL_GUIDES.some(g=>g.id===topic));
});
test('calendar uses future all-day events, stable UIDs and exclusive next-day ends',()=>{
  const ics=preparationCalendar(profile,'es',today,new Date('2026-10-26T18:00:00Z'))!;
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,5);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261106\r\nDTEND;VALUE=DATE:20261107'));
  assert.ok(ics.includes('DTSTAMP:20261026T180000Z'));
  const updated=preparationCalendar(profile,'en',today,new Date('2026-10-27T18:00:00Z'))!;
  const uids=(s:string)=>s.replace(/\r\n /g,'').split('\r\n').filter(l=>l.startsWith('UID:'));
  assert.deepEqual(uids(ics),uids(updated));
  assert.ok(!/ATTENDEE|ORGANIZER|METHOD:REQUEST|STATUS:CONFIRMED/.test(ics));
});
test('calendar skips reminders already past and does not emit a completed, invalid or undated trip',()=>{
  const ics=preparationCalendar(profile,'en','2026-11-19')!;
  assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2);
  assert.ok(!ics.includes('DTSTART;VALUE=DATE:20261118'));
  for(const p of [DEFAULT_PREPARATION,{...profile,endDate:'2026-11-19'},{...profile,startDate:'2026-02-29'},{...profile,startDate:'9999-12-31',endDate:''}])assert.equal(preparationCalendar(p,'es',today),null);
  assert.equal(preparationCalendar(profile,'es','2026-11-26'),null);
  assert.equal(preparationCalendar({...profile,endDate:''},'es','2026-11-21'),null);
});
test('calendar folds UTF-8 safely and escapes semicolons without leaking arbitrary input',()=>{
  const ics=preparationCalendar({...profile,region:'perez_zeledon'},'es',today)!;
  for(const line of ics.split('\r\n')){assert.ok(Buffer.byteLength(line,'utf8')<=75,line);assert.ok(!line.includes('\uFFFD'));}
  assert.ok(ics.replace(/\r\n /g,'').includes('Pérez Zeledón'));
  assert.ok(ics.includes('sugerida\\;'));
  assert.equal(preparationCalendar({...profile,region:'x\r\nATTENDEE:bad' as never},'es',today),null);
});
test('export summary includes current packing/checks, omits unrelated private notes and makes no booking confirmation',()=>{
  const checked={[preparationContext(profile)+'|pack-shoes']:true};
  const text=preparationBrief({...profile,note:'private note'} as PreparationProfile,checked,'en',today);
  assert.ok(text.includes('[x] Terrain-appropriate footwear'));
  assert.ok(text.includes('do not confirm bookings'));
  assert.ok(!text.includes('private note'));
});
test('active practical tools no longer assert guaranteed tickets or universal potable tap water',()=>{
  const active=readFileSync(new URL('../src/components/TravelerToolkit.tsx',import.meta.url),'utf8')+JSON.stringify(TRAVEL_GUIDES);
  assert.ok(!active.includes('entradas ya garantizadas'));
  assert.ok(!active.includes('100% Potable Tap Water'));
  assert.ok(active.includes('excepciones rurales'));
});
