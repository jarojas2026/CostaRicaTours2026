import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import { getFirestoreDb, findBookingByCodeOrEmail } from './bookingService';
import { handleProviderAction, REGISTERED_PROVIDERS } from './providerCommunicationService';
import { sendEmail, sendWhatsAppMessage } from './notificationService';
import { emitOperationalEvent } from './operationalEventBus';

const clean=(v:unknown,max=5000)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const decode=(v='')=>Buffer.from(v.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
function parts(part:any,out:string[]=[]){if(!part)return out;if(part.mimeType==='text/plain'&&part.body?.data)out.push(decode(part.body.data));for(const child of part.parts||[])parts(child,out);return out;}
function header(message:any,name:string){return clean((message.payload?.headers||[]).find((h:any)=>String(h.name).toLowerCase()===name.toLowerCase())?.value,600);}
function emailOf(v:string){return (v.match(/<([^>]+)>/)?.[1]||v).trim().toLowerCase();}
function providerEmails(){
 const configured=new Set<string>();
 const raw=process.env.PROVIDER_EMAILS_JSON;
 if(raw){try{
   const mapping=JSON.parse(raw) as Record<string,string>;
   Object.values(mapping).forEach(value=>{if(value&&/@/.test(value))configured.add(String(value).trim().toLowerCase());});
 }catch{console.warn('⚠️ PROVIDER_EMAILS_JSON no es JSON válido.');}}
 REGISTERED_PROVIDERS.forEach(provider=>{if(provider.email&&/@/.test(provider.email))configured.add(provider.email.trim().toLowerCase());});
 return configured;
}
async function gmail(){const {GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:secret,GMAIL_REFRESH_TOKEN:refresh}=process.env;if(!id||!secret||!refresh)return null;const auth=new google.auth.OAuth2(id,secret);auth.setCredentials({refresh_token:refresh});return google.gmail({version:'v1',auth});}
async function classify(subject:string,body:string){
 const input=(subject+'\n'+body).slice(0,12000);
 if(process.env.GEMINI_API_KEY){try{const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});const r=await ai.models.generateContent({model:'gemini-2.5-flash',contents:['Clasifica únicamente la evidencia textual de una respuesta de proveedor turístico.','JSON estricto: {"action":"confirm|reject|delay|no_show|complete|unknown","confidence":0..1,"notes":"..."}.','No inventes datos. Si no hay evidencia suficiente usa unknown.',input].join('\n')});const p=JSON.parse((r.text||'{}').trim().replace(/^```json\s*|\s*```$/gi,''));if(['confirm','reject','delay','no_show','complete'].includes(p.action))return{action:p.action,confidence:Math.max(0,Math.min(1,Number(p.confidence)||0)),notes:clean(p.notes,1000)};}catch{}}
 const s=input.toLowerCase();
 if(/no hay cupo|sin disponibilidad|no podemos|rechaz|declin|not available|unavailable/.test(s))return{action:'reject' as const,confidence:.86,notes:'Evidencia lingüística de rechazo.'};
 if(/confirmad|confirm|aceptad|cupo garant|we can accommodate|available/.test(s))return{action:'confirm' as const,confidence:.84,notes:'Evidencia lingüística de confirmación.'};
 if(/demora|delay|más tiempo|more time|pending|en revisión/.test(s))return{action:'delay' as const,confidence:.76,notes:'Evidencia lingüística de demora.'};
 if(/no show|no-show|no se presentó/.test(s))return{action:'no_show' as const,confidence:.78,notes:'Evidencia lingüística de no-show.'};
 if(/servicio completado|completed|completado/.test(s))return{action:'complete' as const,confidence:.80,notes:'Evidencia lingüística de servicio completado.'};
 return{action:'unknown' as const,confidence:0,notes:'Evidencia insuficiente.'};
}
async function notifyCustomer(order:any,action:string,notes:string){
 const booking=await findBookingByCodeOrEmail(order.bookingId).catch(()=>null);const customer=booking?.customer||{};const email=booking?.customerEmail||customer.email;const phone=booking?.customerPhone||customer.phone;const name=booking?.customerName||customer.fullName||customer.name||'Viajero';
 const messages:Record<string,string>={confirm:'Hola '+name+'. El proveedor '+order.providerName+' confirmó la solicitud de '+order.tourName+' para '+order.date+'. Seguimos con el siguiente paso de tu reserva.',reject:'Hola '+name+'. '+order.providerName+' informó que no puede atender '+order.tourName+' para '+order.date+'. Conservamos tus preferencias y podemos buscar otra fecha, horario o experiencia similar.',delay:'Hola '+name+'. '+order.providerName+' todavía está revisando tu solicitud. Aún no la presentamos como confirmada y te avisaremos cuando exista una respuesta definitiva.',no_show:'Hola '+name+'. Recibimos un reporte operativo de no-show para '+order.tourName+'. Nuestro equipo está revisando el caso y te informará los próximos pasos.',complete:'Hola '+name+'. El proveedor reportó como completado el servicio '+order.tourName+'. Gracias por viajar con nosotros.'};
 const message=messages[action]||messages.delay;const suffix=notes?'\n\nNota operativa: '+notes:'';
 if(email&&/@/.test(email))await sendEmail({to:email,subject:action==='confirm'?'Solicitud confirmada • Costa Rica Tours':'Actualización de tu solicitud • Costa Rica Tours',html:'<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h2>'+message+'</h2><p>'+suffix.replace(/\n/g,'<br>')+'</p><p>Seguimos contigo paso a paso. Pura Vida.</p></div>'}).catch(()=>undefined);
 if(phone)await sendWhatsAppMessage({toPhone:String(phone),customerName:name,message:message+suffix,bookingId:order.bookingId}).catch(()=>undefined);
}
export async function processProviderInboxOnce(){
 const client=await gmail();if(!client)return{enabled:false,processed:0,ignored:0,errors:0,reason:'Gmail OAuth no configurado.'};
 const db=getFirestoreDb(),known=providerEmails(),userId=process.env.GMAIL_INBOX_USER||'me';const list=await client.users.messages.list({userId,q:'in:inbox is:unread newer_than:7d',maxResults:50});const messages=list.data.messages||[];let processed=0,ignored=0,errors=0;
 for(const item of messages){if(!item.id)continue;try{if(db&&(await db.collection('provider_inbox_events').doc(item.id).get()).exists)continue;const full=await client.users.messages.get({userId,id:item.id,format:'full'});const from=emailOf(header(full.data,'From')),subject=header(full.data,'Subject');const body=clean(parts(full.data.payload).join('\n')||full.data.snippet,12000);const orderId=(subject+'\n'+body).match(/OS-CR-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
  if(!known.has(from)||!orderId){ignored++;if(db)await db.collection('provider_inbox_events').doc(item.id).set({messageId:item.id,from,subject,orderId:orderId||null,status:'ignored',processedAt:new Date().toISOString()});continue;}
  const result=await classify(subject,body);if(result.action==='unknown'||result.confidence<.65){ignored++;if(db)await db.collection('provider_inbox_events').doc(item.id).set({messageId:item.id,from,subject,orderId,status:'needs_human_review',classification:result,processedAt:new Date().toISOString()});continue;}
  const actionResult=await handleProviderAction({orderId,action:result.action as any,notes:result.notes,operatorContact:from});if(!actionResult.success)throw new Error(actionResult.message);await notifyCustomer(actionResult.order,result.action,result.notes);
  await emitOperationalEvent({type:'provider.response.processed',source:'provider_inbox_agent',conversationId:actionResult.order.bookingId,payload:{orderId,action:result.action,confidence:result.confidence,from}}).catch(()=>undefined);
  if(db)await db.collection('provider_inbox_events').doc(item.id).set({messageId:item.id,from,subject,orderId,status:'processed',classification:result,processedAt:new Date().toISOString()});
  await client.users.messages.modify({userId,id:item.id,requestBody:{removeLabelIds:['UNREAD']}}).catch(()=>undefined);processed++;
 }catch(error:any){errors++;if(db)await db.collection('provider_inbox_events').doc(item.id).set({messageId:item.id,status:'error',error:clean(error?.message,800),processedAt:new Date().toISOString()},{merge:true});}}
 return{enabled:true,processed,ignored,errors,scanned:messages.length,checkedAt:new Date().toISOString()};
}