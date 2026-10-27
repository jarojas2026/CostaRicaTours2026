import type { Language, TourCategory, TourRegion } from '../types';
import { CATEGORIES, REGIONS } from '../data/catalogMeta';
import type { TravelTopic } from '../data/travelKnowledge';

export const PREPARATION_REGIONS = ['arenal','monteverde','manuel_antonio','guanacaste','tortuguero','pacuare','san_jose','sjo','caribe','caribe_sur','osa','marino_ballena','perez_zeledon','dominical','uvita','puerto_viejo','cahuita','jaco','cartago','turrialba','corcovado','golfo_dulce','central_pacific','sarapiqui','los_santos','golfito'] as const;
export const PREPARATION_ACTIVITIES = ['volcanoes','wildlife','canopy','beaches','rafting','culture','multiday','combos','adventure','nature','hiking','waterfalls','rural','gastronomy','surf','snorkeling','diving','whale_watching','kayak','fishing','family','services'] as const;
export const isPreparationRegion = (value: unknown): value is TourRegion => typeof value==='string' && (PREPARATION_REGIONS as readonly string[]).includes(value);
export const isPreparationActivity = (value: unknown): value is TourCategory => typeof value==='string' && (PREPARATION_ACTIVITIES as readonly string[]).includes(value);
export interface PreparationProfile {
  region: TourRegion|'all'; activity: TourCategory|'all'; startDate: string; endDate: string;
  family: boolean; accessibility: boolean;
}
export interface PreparationTask { id: string; title: {es:string;en:string}; reason: {es:string;en:string}; topic: TravelTopic; }
export const DEFAULT_PREPARATION: PreparationProfile = {region:'all',activity:'all',startDate:'',endDate:'',family:false,accessibility:false};
const DAY = 86_400_000;
export function civilDay(value: string): number|null {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number);
  if(y<1000||y>9999)return null;
  const ms=Date.UTC(y,m-1,d), date=new Date(ms);
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d ? ms/DAY : null;
}
export function costaRicaDate(now = new Date()): string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function tripTiming(startDate:string,endDate:string,today=costaRicaDate()) {
  const start=civilDay(startDate),end=endDate?civilDay(endDate):null,now=civilDay(today);
  if(!startDate)return {phase:'undated' as const,countdown:null,day:null};
  if(start===null||now===null||(endDate&&end===null)||(end!==null&&end<start))return {phase:'invalid' as const,countdown:null,day:null};
  const countdown=start-now;
  if(end!==null&&now>end)return {phase:'completed' as const,countdown,day:null};
  if(countdown>0)return {phase:'upcoming' as const,countdown,day:null};
  if(countdown===0)return {phase:'today' as const,countdown,day:1};
  if(end===null)return {phase:'return_unknown' as const,countdown,day:null};
  return {phase:'during' as const,countdown,day:now-start+1};
}
const fallbackRegions: Partial<Record<TourRegion,string>> = {sjo:'San José / SJO',caribe_sur:'Caribe Sur',perez_zeledon:'Pérez Zeledón',marino_ballena:'Marino Ballena',golfo_dulce:'Golfo Dulce',central_pacific:'Pacífico Central',los_santos:'Los Santos'};
export function regionLabel(region:PreparationProfile['region'],language:Language):string {
  if(region==='all')return language==='es'?'Costa Rica · región por definir':'Costa Rica · region not set';
  const names=REGIONS.find(r=>r.id===region)?.name;
  return names?.[language]||names?.es||fallbackRegions[region]||region.replaceAll('_',' ').replace(/\b\w/g,s=>s.toUpperCase());
}
export function activityLabel(activity:PreparationProfile['activity'],language:Language):string {
  if(activity==='all')return language==='es'?'Actividad por definir':'Activity not set';
  const names=CATEGORIES.find(c=>c.id===activity)?.name;
  const extra:Partial<Record<TourCategory,{es:string;en:string}>>={adventure:{es:'Aventura',en:'Adventure'},nature:{es:'Naturaleza',en:'Nature'},surf:{es:'Surf',en:'Surfing'},snorkeling:{es:'Esnórquel',en:'Snorkeling'},diving:{es:'Buceo',en:'Diving'},whale_watching:{es:'Observación de ballenas',en:'Whale watching'},kayak:{es:'Kayak',en:'Kayaking'},fishing:{es:'Pesca',en:'Fishing'},family:{es:'En familia',en:'Family'},services:{es:'Servicios',en:'Services'},rural:{es:'Turismo rural',en:'Rural tourism'},gastronomy:{es:'Gastronomía',en:'Food experiences'}};
  return names?.[language]||names?.es||extra[activity]?.[language==='es'?'es':'en']||activity;
}
export function preparationHref(region?:unknown,activity?:unknown):string {
  const params=new URLSearchParams();
  if(isPreparationRegion(region))params.set('region',region);
  if(isPreparationActivity(activity))params.set('activity',activity);
  return `/trip${params.size?'?'+params.toString():''}`;
}
export function preparationContext(profile:PreparationProfile):string {
  return [profile.startDate,profile.endDate,profile.region,profile.activity,profile.family?'family':'',profile.accessibility?'access':''].join('|');
}
export function preparationTasks(profile:PreparationProfile,today=costaRicaDate()):PreparationTask[] {
  const tasks:PreparationTask[]=[];
  const add=(id:string,es:string,en:string,whyEs:string,whyEn:string,topic:TravelTopic)=>tasks.push({id,title:{es,en},reason:{es:whyEs,en:whyEn},topic});
  const timing=tripTiming(profile.startDate,profile.endDate,today);
  if(timing.phase==='completed'){
    add('trip-record','Revisar notas y comprobantes del viaje','Review trip notes and receipts','Conservar lo necesario y retirar datos personales que ya no uses.','Keep what you need and remove personal data you no longer use.','budget');
    add('trip-expenses','Conciliar gastos registrados','Reconcile recorded expenses','Comparar tu registro personal con los comprobantes reales.','Compare your personal record with actual receipts.','budget');
    return tasks;
  }
  if(timing.phase==='today'||timing.phase==='during')add('daily-plan','Revisar la agenda y conexiones de hoy','Review today’s plan and connections','Comprobar con el operador los cambios de esta jornada.','Check today’s changes with the operator.','transport');
  else if(timing.phase==='upcoming'&&timing.countdown!==null&&timing.countdown<=7)add('departure-week','Completar revisión antes de salir','Complete the pre-departure review','La salida está a una semana o menos; revisar documentación y conexiones pendientes.','Departure is within a week; review outstanding documents and connections.','entry');
  add('weather','Consultar avisos y pronóstico','Check advisories and forecast','Revisar cerca de la salida y de cada actividad.','Check close to departure and each activity date.','weather');
  add('meeting','Revisar recogida y conexiones','Review pickup and connections','Confirmar puntos, horario, equipaje y margen de llegada.','Confirm meeting points, times, baggage and arrival buffers.','transport');
  add('packing','Preparar equipaje y documentos offline','Prepare luggage and offline documents','La selección cambia con la región y la actividad.','The selection changes with your region and activity.','packing');
  const nature=['volcanoes','wildlife','nature','hiking','waterfalls','multiday'].includes(profile.activity);
  if(nature)add('park-access','Confirmar acceso, sector y entradas','Confirm access, sector and admission','Una ficha del catálogo no confirma una entrada ni un horario.','A catalog listing does not confirm admission or opening hours.','parks');
  if(['canopy','rafting','adventure','surf','diving','snorkeling','kayak'].includes(profile.activity))add('requirements','Revisar requisitos y equipo de aventura','Review adventure requirements and equipment','Solicitar condiciones específicas para quienes participan.','Request specific conditions for every participant.','adventure');
  if(['rafting','kayak','snorkeling','diving','beaches','surf','whale_watching','fishing'].includes(profile.activity))add('water-gear','Preparar protección para agua y sol','Prepare water and sun protection','Verificar condiciones de salida y el equipo requerido.','Check departure conditions and required equipment.','adventure');
  if(profile.region==='monteverde'||['hiking','volcanoes','multiday'].includes(profile.activity))add('layers','Añadir capas y calzado de buen agarre','Add layers and footwear with traction','Bosque y montaña requieren preparar el terreno concreto.','Forest and mountain visits require checking the actual terrain.','packing');
  if(['osa','corcovado','tortuguero','golfito','golfo_dulce'].includes(profile.region))add('remote','Revisar conexión terrestre o en bote','Review ground or boat connections','Confirmar conexiones, equipaje y alternativa si cambia la operación.','Confirm connections, baggage and an alternative if operations change.','transport');
  if(profile.family||profile.activity==='family')add('family','Confirmar condiciones para menores','Confirm requirements for children','Consultar edades, equipo, duración y acompañamiento; no asumir admisión.','Ask about ages, equipment, duration and supervision; do not assume admission.','adventure');
  if(profile.accessibility)add('access','Consultar accesibilidad del recorrido','Ask about route accessibility','Revisar terreno, baños, embarque y apoyos antes de reservar.','Check terrain, restrooms, boarding and assistance before booking.','accessibility');
  if(nature||['wildlife','nature','rural'].includes(profile.activity))add('wildlife','Repasar visita responsable','Review responsible visit guidance','Seguir senderos e indicaciones; no intervenir con la fauna.','Follow trails and instructions; do not disturb wildlife.','wildlife');
  return tasks;
}
export function preparationTopics(profile:PreparationProfile,today=costaRicaDate()):TravelTopic[] {
  return [...new Set<TravelTopic>([...[...preparationTasks(profile,today),...packingTasks(profile)].map(t=>t.topic),'entry','budget','connectivity'])];
}
export function preparationBrief(profile:PreparationProfile,checked:Record<string,boolean>,language:Language,today=costaRicaDate()):string {
  const es=language==='es',key=preparationContext(profile);
  return [es?'Preparación personal · Costa Rica Tours':'Personal preparation · Costa Rica Tours',regionLabel(profile.region,language),activityLabel(profile.activity,language),`${es?'Salida':'Departure'}: ${profile.startDate||'—'} · ${es?'Regreso':'Return'}: ${profile.endDate||'—'}`,`${es?'Fecha de revisión (Costa Rica)':'Review date (Costa Rica)'}: ${today}`,'',...[...preparationTasks(profile,today),...packingTasks(profile)].map(t=>`${checked[key+'|'+t.id]?'[x]':'[ ]'} ${t.title[es?'es':'en']}`),'',es?'Pendientes personales; no confirman reservas, accesos ni pagos.':'Personal tasks; they do not confirm bookings, access or payments.'].join('\n');
}
const isoFromDay=(day:number)=>new Date(day*DAY).toISOString().slice(0,10);
const escapeCalendar=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function foldCalendarLine(line:string):string {
  const parts:string[]=[];let chunk='',bytes=0;
  for(const char of line){const length=new TextEncoder().encode(char).length;if(bytes+length>73){parts.push(chunk);chunk=' ';bytes=1;}chunk+=char;bytes+=length;}
  parts.push(chunk);return parts.join('\r\n');
}
export function preparationCalendar(profile:PreparationProfile,language:Language,today=costaRicaDate(),createdAt=new Date()):string|null {
  if((profile.region!=='all'&&!isPreparationRegion(profile.region))||(profile.activity!=='all'&&!isPreparationActivity(profile.activity)))return null;
  const timing=tripTiming(profile.startDate,profile.endDate,today),start=civilDay(profile.startDate),now=civilDay(today);
  if(start===null||now===null||start>civilDay('9999-12-30')!||(civilDay(profile.endDate)??0)>civilDay('9999-12-30')!||timing.phase==='invalid'||timing.phase==='completed')return null;
  const es=language==='es';
  const events:[string,number,string][]=[['documents',start-14,es?'Revisar documentos y requisitos':'Review documents and requirements'],['access',start-7,es?'Revisar reservas, accesos y conexiones':'Review bookings, access and connections'],['packing',start-2,es?'Revisar equipaje y avisos':'Review packing and advisories'],['departure',start,es?'Revisar agenda de salida':'Review departure plan']];
  const end=civilDay(profile.endDate);if(end!==null)events.push(['return',end,es?'Revisar conexiones de regreso':'Review return connections']);
  const future=events.filter(([,day])=>day>=now);if(!future.length)return null;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Costa Rica Tours//Personal preparation//EN','CALSCALE:GREGORIAN'];
  for(const[id,day,title]of future){lines.push('BEGIN:VEVENT',`UID:crt-preparation-${profile.startDate}-${profile.region}-${profile.activity}-${id}@costaricatours2026.vercel.app`,`DTSTAMP:${createdAt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${isoFromDay(day).replaceAll('-','')}`,`DTEND;VALUE=DATE:${isoFromDay(day+1).replaceAll('-','')}`,`SUMMARY:${escapeCalendar(title+' · Costa Rica Tours')}`,`DESCRIPTION:${escapeCalendar(regionLabel(profile.region,language)+' · '+activityLabel(profile.activity,language)+'. '+(es?'Revisión personal sugerida; no es un plazo legal ni una confirmación de reserva.':'Suggested personal review; not a legal deadline or booking confirmation.'))}`,'END:VEVENT');}
  lines.push('END:VCALENDAR','');return lines.map(foldCalendarLine).join('\r\n');
}

export function packingTasks(profile:PreparationProfile):PreparationTask[] {
  const items:PreparationTask[]=[];
  const add=(id:string,es:string,en:string,whyEs:string,whyEn:string)=>items.push({id:'pack-'+id,title:{es,en},reason:{es:whyEs,en:whyEn},topic:'packing'});
  add('bottle','Botella reutilizable','Reusable bottle','Confirmar dónde recargar agua potable.','Confirm where potable refills are available.');
  add('rain','Protección ligera para lluvia','Light rain protection','Adaptar a los avisos y al recorrido.','Adapt to advisories and the actual route.');
  add('sun','Sombrero y protección para sol','Hat and sun protection','Preparar según la actividad y tus necesidades.','Prepare for the activity and personal needs.');
  add('documents','Documentos y copias sin conexión','Documents and offline copies','Guardar de forma privada en tu dispositivo.','Keep them privately on your device.');
  add('power','Cargador y adaptador compatible','Charger and compatible adapter','Comprobar las especificaciones del equipo.','Check your device specifications.');
  if(['rafting','kayak','snorkeling','diving','surf','waterfalls','whale_watching','fishing'].includes(profile.activity)||profile.region==='tortuguero')add('drybag','Protección impermeable para equipos','Waterproof protection for equipment','Verificar el equipo autorizado para la salida.','Check permitted equipment for the outing.');
  if(['hiking','volcanoes','nature','wildlife','waterfalls','multiday'].includes(profile.activity)||profile.region==='monteverde')add('shoes','Calzado adecuado para el terreno','Terrain-appropriate footwear','Comprobar agarre y comodidad antes de viajar.','Check traction and comfort before traveling.');
  if(profile.region==='monteverde'||profile.region==='perez_zeledon'||profile.region==='los_santos')add('layer','Capa adicional para montaña','Extra layer for mountain visits','Ajustar al sitio y al pronóstico; no es un reporte en vivo.','Adjust to the location and forecast; this is not a live report.');
  return items;
}
