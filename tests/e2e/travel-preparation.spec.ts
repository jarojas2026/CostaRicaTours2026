import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';
import catalog from '../../src/data/catalogTours.json' with { type: 'json' };

const futureDate=(days:number)=>new Date(Date.now()+days*86_400_000).toISOString().slice(0,10);

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('cookie-consent','essential');});
  await mockApi(page);
});

test('official guide filters, empty search, URL history and reset',async({page,consoleProblems})=>{
  await page.goto('/tools?topic=parks');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Información útil para decidir y viajar');
  await expect(page.locator('[data-guide-id]')).toHaveCount(1);
  await expect(page.locator('[data-guide-id="parks"]')).toContainText('SINAC · Compra y reserva');
  await expect(page.locator('[data-guide-id] a[href^="http"]')).toHaveCount(0);
  await expect(page.locator('[data-guide-id="parks"] details')).toHaveAttribute('open','');
  await page.getByLabel('Buscar información').fill('zzzinexistente');
  await expect(page.getByRole('heading',{name:'No encontramos ese término en la guía'})).toBeVisible();
  await page.getByRole('button',{name:'Restablecer búsqueda',exact:true}).click();
  await expect(page.locator('[data-guide-id]')).toHaveCount(12);
  await page.getByLabel('Tema de la guía').selectOption('water');
  await expect(page).toHaveURL(/topic=water/);
  await expect(page.locator('[data-guide-id="water"]')).toContainText('excepciones rurales');
  await page.goBack();await expect(page.locator('[data-guide-id]')).toHaveCount(12);
  await page.goForward();await expect(page.getByLabel('Tema de la guía')).toHaveValue('water');
  expectNoConsoleErrors(consoleProblems);
});

test('guide converts USD to CRC even when the global currency is USD',async({page,consoleProblems})=>{
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('crt_currency','USD');});
  await page.goto('/tools?topic=budget');
  await expect(page.getByRole('heading',{name:/Conversor orientativo.*USD → CRC/})).toBeVisible();
  await expect(page.getByTestId('guide-conversion-result')).toContainText('₡');
  await expect(page.getByTestId('guide-conversion-result')).toContainText(/51[\s.,]?000/);
  await page.getByLabel('Monto de referencia en USD').fill('200');
  await expect(page.getByTestId('guide-conversion-result')).toContainText(/102[\s.,]?000/);
  await page.getByLabel('Monto de referencia en USD').fill('-1');
  await expect(page.getByRole('alert').filter({hasText:'monto válido'})).toBeVisible();
  await expect(page.getByTestId('guide-conversion-result')).toHaveText('—');
  expectNoConsoleErrors(consoleProblems);
});

test('contextual plan adapts tasks and packing, isolates checks and preserves old notes, tasks and full expense history',async({page,consoleProblems})=>{
  await page.addInitScript(()=>{
    if(window===window.top&&!sessionStorage.getItem('crt_traveler_os_v1'))sessionStorage.setItem('crt_traveler_os_v1',JSON.stringify({trip:{destination:'Plan de prueba',startDate:'',travelers:3,budgetUSD:90,note:'Nota anterior conservada'},tasks:[{id:'legacy-task',labelEs:'Pendiente anterior',labelEn:'Earlier task',done:true,category:'before'}],spentUSD:100,expenses:Array.from({length:35},(_,i)=>({id:'legacy-'+i,label:'Gasto histórico '+i,amount:1}))}));
  });
  await page.goto('/trip?region=monteverde&activity=hiking');
  await expect(page.getByLabel('Región principal')).toHaveValue('monteverde');
  await expect(page.getByLabel('Actividad principal')).toHaveValue('hiking');
  await expect(page.getByLabel('Notas privadas del viaje')).toHaveValue('Nota anterior conservada');
  await expect(page.getByRole('button',{name:'Pendiente anterior'})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Eliminar gasto'})).toHaveCount(35);
  await expect(page.getByTestId('budget-overrun')).toContainText('10.00');
  const start=futureDate(30),end=futureDate(35);
  await page.getByLabel('Fecha de inicio (Costa Rica)',{exact:true}).fill(start);
  await page.getByLabel('Fecha de regreso / finalización').fill(end);
  const weather=page.getByRole('checkbox',{name:/^Consultar avisos y pronóstico/});
  await weather.check();await expect(weather).toBeChecked();
  await page.getByLabel('Actividad principal').selectOption('rafting');
  await expect(weather).not.toBeChecked();
  await expect(page.getByRole('checkbox',{name:/^Revisar requisitos y equipo de aventura/})).toBeVisible();
  await page.getByText(/Equipaje sugerido para este plan/).click();
  await expect(page.getByRole('checkbox',{name:/^Protección impermeable para equipos/})).toBeVisible();
  await page.getByLabel('Actividad principal').selectOption('hiking');await expect(weather).toBeChecked();
  await page.getByLabel('Incluir preguntas de accesibilidad').check();
  await expect(page.getByRole('checkbox',{name:/^Consultar accesibilidad del recorrido/})).toBeVisible();
  await page.getByRole('button',{name:'Guardar ahora',exact:true}).click();
  await page.reload();
  await expect(page.getByLabel('Notas privadas del viaje')).toHaveValue('Nota anterior conservada');
  await expect(page.getByLabel('Fecha de inicio (Costa Rica)',{exact:true})).toHaveValue(start);
  const stored=await page.evaluate(()=>({personalLocal:localStorage.getItem('crt_traveler_os_v1'),session:JSON.parse(sessionStorage.getItem('crt_traveler_os_v1')||'{}')}));
  expect(stored.personalLocal).toBeNull();expect(stored.session.expenses).toHaveLength(35);
  expectNoConsoleErrors(consoleProblems);
});

test('calendar download has only personal future events and invalid dates disable it',async({page,consoleProblems})=>{
  await page.goto('/trip?region=osa&activity=wildlife');
  const calendar=page.getByRole('button',{name:'Descargar recordatorios (.ics)',exact:true});
  await expect(calendar).toBeDisabled();
  const start=futureDate(30),end=futureDate(35);
  await page.getByLabel('Fecha de inicio (Costa Rica)',{exact:true}).fill(start);
  await page.getByLabel('Fecha de regreso / finalización').fill(end);
  const download=page.waitForEvent('download');await calendar.click();
  const file=await download;expect(file.suggestedFilename()).toBe('costa-rica-preparacion.ics');
  const ics=await readFile((await file.path())!,'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR\r\n');expect(ics).toContain('DTSTART;VALUE=DATE:'+start.replaceAll('-',''));
  expect(ics).not.toMatch(/ATTENDEE|STATUS:CONFIRMED|METHOD:REQUEST/);
  await expect(page.getByRole('status').filter({hasText:'Impórtalo en tu calendario'})).toBeVisible();
  await page.getByLabel('Fecha de regreso / finalización').fill(futureDate(29));
  await expect(page.getByRole('alert').filter({hasText:'final no puede ser anterior'})).toBeVisible();await expect(calendar).toBeDisabled();
  expectNoConsoleErrors(consoleProblems);
});

test('storage refusal is explicit and copying has a readable fallback',async({page})=>{
  await page.addInitScript(()=>{
    const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='crt_traveler_os_v1')throw new DOMException('Storage blocked','QuotaExceededError');return set.call(this,key,value);};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('Blocked'))}});
  });
  await page.goto('/trip');
  await expect(page.getByRole('alert').filter({hasText:'no permitió guardar'})).toBeVisible();
  await page.getByRole('button',{name:'Guardar ahora',exact:true}).click();
  await expect(page.getByRole('button',{name:'Guardado',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Copiar resumen',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'cópialo manualmente'})).toBeVisible();
  await page.getByText('Ver resumen antes de copiar',{exact:true}).click();
  await expect(page.getByLabel('Resumen de preparación')).toHaveValue(/Preparación personal/);
});

test('tour and map entry points carry public context without booking or messages',async({page,consoleProblems})=>{
  const tour=catalog.tours.find(t=>t.priceUSD>0)!;
  const writes:string[]=[];page.on('request',r=>{if(r.url().includes('/api/')&&r.method()==='POST')writes.push(new URL(r.url()).pathname);});
  await page.goto('/tour/'+tour.id);
  await page.getByTestId('travel-preparation-entry').getByRole('link',{name:'Preparar mi viaje'}).click();
  await expect(page.getByLabel('Región principal')).toHaveValue(tour.region);
  await expect(page.getByLabel('Actividad principal')).toHaveValue(tour.category);
  await page.goto('/map');
  await page.getByRole('button',{name:'Herramientas',exact:true}).click();
  await page.getByRole('link',{name:'Guía y preparación para esta ruta'}).click();
  await expect(page).toHaveURL(/\/trip/);
  expect(writes.filter(p=>/booking|notification|contact|payment/.test(p))).toEqual([]);
  expectNoConsoleErrors(consoleProblems);
});

test('mobile guidance and preparation stay usable without horizontal overflow',async({page,consoleProblems},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/tools?topic=packing','/trip?region=monteverde&activity=hiking']){
    await page.goto(path);await expect(page.getByRole('heading',{level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(path.startsWith('/tools')?'guide-mobile.png':'trip-mobile.png'),fullPage:true});
  }
  await page.getByLabel('Incluir preguntas para viajar con menores').check();
  await expect(page.getByRole('checkbox',{name:/^Confirmar condiciones para menores/})).toBeVisible();
  await page.getByRole('checkbox',{name:/^Consultar avisos y pronóstico/}).check();
  await expect(page.getByTestId('preparation-progress')).toHaveText(/^1\//);
  expectNoConsoleErrors(consoleProblems);
});

test('new guide and preparation panel are accessible in English',async({page})=>{
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('crt_language','en');});
  await page.goto('/tools?topic=entry');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Useful information to plan and travel');
  const guideAudit=await new AxeBuilder({page}).include('#traveler-toolkit').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(guideAudit.violations.filter(v=>['critical','serious'].includes(v.impact||''))).toEqual([]);
  await page.getByRole('link',{name:'Prepare my trip',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your next steps'})).toBeVisible();
  const panelAudit=await new AxeBuilder({page}).include('[data-testid="automatic-preparation"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(panelAudit.violations.filter(v=>['critical','serious'].includes(v.impact||''))).toEqual([]);
});
