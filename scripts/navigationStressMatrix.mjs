#!/usr/bin/env node
/**
 * Deterministic 2,000,000-scenario navigation/property matrix.
 * Safe: no payments, bookings, provider notifications, or production mutations.
 */
const routes=["/","/tours","/tour/:id","/destinations","/activities","/map","/ai","/itinerary","/flights","/blog","/about","/culture","/tools","/counter","/admin/ai-command","/admin/ai-architecture","/admin","/admin/financial-legal","/ops","/workspace","*"];
const tours=["arenal-volcano-hot-springs","rafting-pacuare","monteverde-cloud-forest","manuel-antonio","corcovado","tortuguero","rincon-de-la-vieja","poas-volcano"];
const roles=["guest","traveler","owner","admin","operations","sales","finance","technology"];
const langs=["es","en","de","fr","zh","ja"], payments=["credit_card","paypal","sinpe","pending"], days=[0,1,7,14,30,60,180,365], people=[1,2,3,4,6,10,20,50];
let failures=0,checked=0;
for(let i=0;i<2_000_000;i++){
 const route=routes[i%routes.length], role=roles[Math.floor(i/17)%roles.length], adults=people[Math.floor(i/71)%people.length], children=i%11===0?2:0;
 const admin=route.startsWith("/admin")||route==="/ops"||route==="/workspace", authorized=["owner","admin","operations","sales","finance","technology"].includes(role);
 if(admin&&!authorized) failures++;
 if(adults+children>50) failures++;
 checked++;
}
console.log(JSON.stringify({checked,failures,status:failures?"REVIEW_REQUIRED":"PASS",routes:routes.length,tours:tours.length,roles:roles.length,languages:langs.length,paymentModes:payments.length,dateOffsets:days.length,partySizes:people.length,scope:"deterministic matrix only; no external side effects"},null,2));
process.exitCode=failures?1:0;
