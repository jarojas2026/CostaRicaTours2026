/**
 * Wide responsive navigation audit.
 *
 * Exercises public/protected route shells at multiple mobile/tablet/desktop
 * dimensions, resizes the same browser page, uses vertical + horizontal wheel
 * input, follows safe internal GET links, and reports visible elements that
 * escape the viewport. It NEVER submits forms, payments, bookings, provider
 * actions or customer messages.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE=(process.env.AUDIT_TARGET_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const OUT=process.env.AUDIT_OUT_DIR||'artifacts/responsive-navigation';
const ROUTES=[
  '/', '/ciudad', '/participar', '/tours', '/destinations', '/activities',
  '/map', '/ai', '/trip', '/itinerary', '/flights', '/blog', '/about',
  '/culture', '/tools', '/counter', '/workspace', '/provider/portal',
  '/admin', '/admin/ai-command', '/admin/ai-architecture',
  '/admin/email-operations', '/admin/financial-legal', '/ops'
];
const VIEWPORTS=[
  {id:'phone-320',width:320,height:568,mobile:true},
  {id:'phone-360',width:360,height:800,mobile:true},
  {id:'phone-390',width:390,height:844,mobile:true},
  {id:'tablet-portrait',width:768,height:1024,mobile:true},
  {id:'tablet-landscape',width:1024,height:768,mobile:false},
  {id:'desktop-small',width:1280,height:720,mobile:false},
  {id:'desktop-large',width:1920,height:1080,mobile:false},
];
const SAFE_LINK_PATHS=new Set([
  '/', '/ciudad', '/participar', '/tours', '/destinations', '/activities',
  '/map', '/ai', '/trip', '/itinerary', '/flights', '/blog', '/about',
  '/culture', '/tools', '/counter'
]);

await mkdir(OUT,{recursive:true});
const report={
  target:BASE,
  startedAt:new Date().toISOString(),
  safety:'read-only; all non-GET requests blocked; no form submissions or external navigation',
  pages:[],
  safeLinks:[],
  interactionChecks:[],
  resizeChecks:[],
  summary:{},
};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});

function isSafeGet(req){
  if(req.method()!=='GET') return false;
  try{
    const url=new URL(req.url());
    return url.origin===new URL(BASE).origin || ['data:','blob:'].includes(url.protocol);
  }catch{return false;}
}

async function guardContext(context){
  await context.route('**/*',async route=>{
    const req=route.request();
    if(req.method()!=='GET') return route.abort();
    if(req.isNavigationRequest()){
      try{
        const target=new URL(req.url());
        if(target.origin!==new URL(BASE).origin) return route.abort();
      }catch{return route.abort();}
    }
    return route.continue();
  });
  await context.addInitScript(()=>localStorage.setItem('cookie-consent','essential'));
}

async function inspect(page,route,viewport){
  const jsErrors=[];
  page.on('pageerror',e=>jsErrors.push(String(e.message||e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error') jsErrors.push(m.text().slice(0,300));});
  const response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(700);
  await page.mouse.wheel(0,Math.max(700,viewport.height));
  await page.waitForTimeout(80);
  await page.mouse.wheel(0,-Math.max(700,viewport.height));
  await page.mouse.wheel(900,0);
  await page.waitForTimeout(80);
  const info=await page.evaluate(()=>{
    const vw=document.documentElement.clientWidth;
    const vh=window.innerHeight;
    const visible=(el)=>{
      const cs=getComputedStyle(el);
      const r=el.getBoundingClientRect();
      return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>1&&r.height>1;
    };
    const pathFor=(el)=>{
      const id=el.id?('#'+el.id):'';
      const cls=String(el.className||'').trim().split(/\s+/).slice(0,3).join('.');
      return el.tagName.toLowerCase()+id+(cls?'.'+cls:'');
    };
    const inHorizontalScroller=(el)=>{
      let node=el.parentElement;
      while(node && node!==document.body && node!==document.documentElement){
        const style=getComputedStyle(node);
        if((style.overflowX==='auto'||style.overflowX==='scroll') && node.scrollWidth>node.clientWidth+3) return true;
        node=node.parentElement;
      }
      return false;
    };
    const candidates=[...document.querySelectorAll('a[href],button,input,select,textarea,label,h1,h2,h3,h4,h5,h6,p,li,td,th')]
      .filter(visible)
      .filter(el=>!el.closest('svg,.leaflet-map-pane,.leaflet-control-container,[aria-hidden="true"],.pointer-events-none'))
      .filter(el=>!inHorizontalScroller(el));
    const overflow=candidates.map(el=>{
      const r=el.getBoundingClientRect();
      return {
        el,
        path:pathFor(el),
        left:Math.round(r.left),
        right:Math.round(r.right),
        width:Math.round(r.width),
        text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,120),
      };
    }).filter(x=>x.left < -6 || x.right > vw + 6)
      .sort((a,b)=>Math.max(Math.abs(b.left),b.right-vw)-Math.max(Math.abs(a.left),a.right-vw))
      .slice(0,20)
      .map(({el,...x})=>x);
    const docOverflow=Math.max(0,document.documentElement.scrollWidth-vw);
    const inputs=[...document.querySelectorAll('input,select,textarea,button')].filter(visible);
    const tooWideControls=inputs.map(el=>({path:pathFor(el),width:Math.round(el.getBoundingClientRect().width)}))
      .filter(x=>x.width>vw+6).slice(0,12);
    const tinyText=[...document.querySelectorAll('p,span,li,label,a,button')].filter(visible).map(el=>{
      const size=parseFloat(getComputedStyle(el).fontSize||'0');
      return {path:pathFor(el),size,text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,80)};
    }).filter(x=>x.size>0&&x.size<10).slice(0,12);
    const main=document.querySelector('main');
    return {
      title:document.title,
      heading:(document.querySelector('h1,h2')?.textContent||'').trim().slice(0,160),
      viewport:{width:vw,height:vh},
      documentWidth:document.documentElement.scrollWidth,
      documentOverflowPx:docOverflow,
      horizontalScrollX:window.scrollX,
      overflow,
      tooWideControls,
      tinyText,
      bodyChars:(document.body.innerText||'').trim().length,
      mainTop:main?Math.round(main.getBoundingClientRect().top):null,
      forms:document.querySelectorAll('form').length,
      clickables:document.querySelectorAll('a[href],button,[role="button"],input,select,textarea').length,
    };
  });
  const pageResult={
    route,device:viewport.id,http:response?.status()??null,...info,
    jsErrors:jsErrors.slice(0,12),
    outcome:(!response||response.status()>=400||!info.bodyChars||info.documentOverflowPx>4||info.tooWideControls.length>0||info.overflow.length>0)?'needs-review':'pass'
  };
  report.pages.push(pageResult);
  process.stdout.write('RESPONSIVE_PAGE '+JSON.stringify({
    route,device:viewport.id,http:pageResult.http,overflowPx:info.documentOverflowPx,
    offenders:info.overflow.slice(0,4).map(x=>x.path),errors:pageResult.jsErrors.length
  })+'\n');
  if(info.documentOverflowPx>4||info.overflow.length){
    const slug=(viewport.id+'-'+(route==='/'?'home':route.slice(1))).replace(/[^a-z0-9-]+/gi,'-');
    await page.screenshot({path:join(OUT,slug+'.png'),fullPage:false}).catch(()=>{});
  }
}

async function safeLinkWalk(context,viewport){
  const page=await context.newPage();
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(500);
  for(const wanted of SAFE_LINK_PATHS){
    await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(150);
    const links=page.locator('a[href]');
    let found=false;
    for(let i=0;i<Math.min(await links.count(),120);i++){
      const href=await links.nth(i).getAttribute('href');
      if(!href) continue;
      let path;
      try{path=new URL(href,BASE).pathname;}catch{continue;}
      if(path!==wanted) continue;
      const box=await links.nth(i).boundingBox().catch(()=>null);
      if(!box) continue;
      await links.nth(i).scrollIntoViewIfNeeded().catch(()=>{});
      await links.nth(i).click({timeout:3000}).catch(()=>{});
      await page.waitForTimeout(150);
      report.safeLinks.push({device:viewport.id,wanted,arrived:new URL(page.url()).pathname,visible:true});
      found=true;break;
    }
    if(!found) report.safeLinks.push({device:viewport.id,wanted,arrived:null,visible:false});
  }
  await page.close();
}

async function interactionCheck(context){
  const page=await context.newPage();

  // A route click made from deep in the previous page must reveal the new page
  // immediately; users should not need to hunt vertically for the result.
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.scrollTo(0,Math.min(2400,document.documentElement.scrollHeight)));
  const startY=await page.evaluate(()=>window.scrollY);
  const tourLink=page.locator('a[href="/tours"]').filter({visible:true}).first();
  if(await tourLink.count()){
    await tourLink.scrollIntoViewIfNeeded();
    await tourLink.click({timeout:5000});
    await page.waitForURL(url=>url.pathname==='/tours',{timeout:10000});
    await page.waitForTimeout(150);
    const state=await page.evaluate(()=>({
      scrollY:window.scrollY,
      activeId:document.activeElement?.id||null,
      mainTop:Math.round(document.getElementById('main-content')?.getBoundingClientRect().top||0),
    }));
    report.interactionChecks.push({
      id:'route-click-reveals-destination',
      pass:state.scrollY<40 && state.mainTop<180,
      startY,
      ...state,
    });
  } else {
    report.interactionChecks.push({id:'route-click-reveals-destination',pass:false,error:'No visible /tours link found'});
  }

  // The national layers chooser is intentionally multi-select, but it must
  // never trap the map behind an undismissable floating panel.
  await page.goto(BASE+'/map',{waitUntil:'domcontentloaded',timeout:30000});
  const toggle=page.locator('#national-poi-layers-toggle');
  await toggle.waitFor({state:'visible',timeout:12000});
  await toggle.click();
  const panel=page.locator('#national-poi-layers-panel');
  await panel.waitFor({state:'visible',timeout:5000});
  const bounds=await panel.boundingBox();
  const viewport=page.viewportSize();
  const withinViewport=!!bounds && !!viewport &&
    bounds.x>=-2 && bounds.y>=-2 &&
    bounds.x+bounds.width<=viewport.width+2 &&
    bounds.y<viewport.height;
  const close=panel.locator('button').filter({has:page.locator('svg')}).first();
  await close.click({timeout:5000});
  await panel.waitFor({state:'hidden',timeout:5000});
  report.interactionChecks.push({
    id:'national-layers-open-visible-and-close',
    pass:withinViewport,
    withinViewport,
    viewport,
    bounds,
  });

  await page.close();
}

async function resizeCheck(context){
  const page=await context.newPage();
  await page.goto(BASE+'/tours',{waitUntil:'domcontentloaded',timeout:30000});
  for(const vp of VIEWPORTS){
    await page.setViewportSize({width:vp.width,height:vp.height});
    await page.waitForTimeout(120);
    const result=await page.evaluate(()=>({
      width:document.documentElement.clientWidth,
      scrollWidth:document.documentElement.scrollWidth,
      overflowPx:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
      y:window.scrollY
    }));
    report.resizeChecks.push({device:vp.id,...result});
    process.stdout.write('RESIZE '+JSON.stringify({device:vp.id,...result})+'\n');
  }
  await page.close();
}

try{
  for(const vp of VIEWPORTS){
    const context=await browser.newContext({
      viewport:{width:vp.width,height:vp.height},
      isMobile:vp.mobile,
      hasTouch:vp.mobile,
      deviceScaleFactor:vp.mobile?2:1,
      reducedMotion:'reduce'
    });
    await guardContext(context);
    for(const route of ROUTES){
      const page=await context.newPage();
      try{await inspect(page,route,vp);}
      catch(error){
        report.pages.push({route,device:vp.id,outcome:'fatal',error:String(error).slice(0,500)});
        process.stdout.write('RESPONSIVE_FATAL '+JSON.stringify({route,device:vp.id,error:String(error).slice(0,250)})+'\n');
      }finally{await page.close();}
    }
    if(vp.id==='phone-360'||vp.id==='desktop-small') await safeLinkWalk(context,vp);
    await context.close();
  }
  const interactionContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});
  await guardContext(interactionContext);
  await interactionCheck(interactionContext);
  await interactionContext.close();

  const resizeContext=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});
  await guardContext(resizeContext);
  await resizeCheck(resizeContext);
  await resizeContext.close();
}finally{
  await browser.close();
}

const overflowPages=report.pages.filter(x=>(x.documentOverflowPx||0)>4||x.tooWideControls?.length||x.overflow?.length);
const fatalPages=report.pages.filter(x=>x.outcome==='fatal'||(x.http!==undefined&&x.http!==null&&x.http>=400));
report.summary={
  routeObservations:report.pages.length,
  expectedRouteObservations:ROUTES.length*VIEWPORTS.length,
  overflowPages:overflowPages.length,
  fatalPages:fatalPages.length,
  safeLinkChecks:report.safeLinks.length,
  interactionChecks:report.interactionChecks.length,
  failedInteractionChecks:report.interactionChecks.filter(x=>!x.pass).length,
  resizeChecks:report.resizeChecks.length,
};
await writeFile(join(OUT,'report.json'),JSON.stringify(report,null,2));
await writeFile(join(OUT,'report.md'),[
  '# Responsive navigation audit','',
  'Target: '+BASE,'',
  '- Route observations: **'+report.summary.routeObservations+'** / '+report.summary.expectedRouteObservations,
  '- Pages with viewport overflow: **'+report.summary.overflowPages+'**',
  '- Fatal/HTTP failures: **'+report.summary.fatalPages+'**',
  '- Safe internal link checks: **'+report.summary.safeLinkChecks+'**',
  '- Interaction reveal checks: **'+report.summary.interactionChecks+'** (failed: '+report.summary.failedInteractionChecks+')',
  '- Live resize checks: **'+report.summary.resizeChecks+'**','',
  '## Overflow findings','',
  ...overflowPages.map(x=>'### '+x.device+' '+x.route+'\nOverflow: '+(x.documentOverflowPx||0)+'px\n'+(x.overflow||[]).map(o=>'- '+o.path+' ['+o.left+','+o.right+'] '+o.text).join('\n')),
].join('\n'));
process.stdout.write('RESPONSIVE_RESULT '+JSON.stringify(report.summary)+'\n');
if(report.summary.routeObservations!==report.summary.expectedRouteObservations||fatalPages.length||overflowPages.length||report.summary.failedInteractionChecks){
  process.exitCode=1;
}
