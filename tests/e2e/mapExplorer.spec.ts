import {expect,mockApi,test,expectNoConsoleErrors} from './fixtures';
import {readFileSync} from 'node:fs';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{if(window===window.top)window.localStorage.setItem('cookie-consent','essential');});
 await mockApi(page);await page.goto('/map');await expect(page.locator('#costa-rica-leaflet-map-canvas.leaflet-container')).toBeVisible();
});
test('national search, presets, subtype and result selection share one dock',async({page,consoleProblems})=>{
 await page.locator('#national-poi-layers-toggle').click();await page.getByRole('button',{name:'Dormir y comer',exact:true}).click();
 await expect(page.locator('#map-result-count')).not.toHaveText('0');
 await expect(page.locator('#map-poi-type option[value=hotel]')).toBeAttached();
 await page.locator('#map-poi-type').selectOption('hotel');
 await page.locator('#map-search-input').fill('hotel');await page.locator('#map-results-toggle').click();
 const first=page.locator('#map-explorer-results .crt-map-result').first();await expect(first).toBeVisible();
 const label=(await first.locator('strong').innerText());await first.click();
 const detail=page.locator('#map-selected-service-panel, #map-selected-poi-panel');await expect(detail).toBeVisible();await expect(detail).toContainText(label);
 const boxes=await page.evaluate(()=>{const map=document.querySelector('#costa-rica-leaflet-map-canvas')!.getBoundingClientRect(),dock=document.querySelector('#map-selected-service-panel, #map-selected-poi-panel')!.getBoundingClientRect();return{mapRight:map.right,dockLeft:dock.left};});expect(boxes.mapRight).toBeLessThanOrEqual(boxes.dockLeft+2);
 await page.keyboard.press('Escape');await expect(detail).toBeHidden();expectNoConsoleErrors(consoleProblems);
});
test('filters are reactive and the new duration selector excludes longer tours',async({page})=>{
 await page.locator('#national-poi-layers-toggle').click();
 await page.getByText('Tours y servicios del catálogo',{exact:true}).click();
 const before=Number((await page.locator('#map-result-count').innerText()).replace(/\D/g,''));
 await page.locator('#map-tour-duration').selectOption('4');
 await expect.poll(async()=>Number((await page.locator('#map-result-count').innerText()).replace(/\D/g,''))).toBeLessThan(before);
 await page.locator('#map-search-input').fill('zzzz-no-existe');await page.locator('#map-results-toggle').click();
 await expect(page.locator('#map-explorer-results')).toContainText('No hay resultados');
 await page.getByRole('button',{name:'Restablecer búsqueda',exact:true}).click();
 await expect(page.locator('#map-explorer-results .crt-map-result').first()).toBeVisible();
});
test('base surfaces and approximate region overlays remain available without floating dialogs',async({page})=>{
 await page.locator('#map-tools-toggle').click();const surfaces=page.locator('#map-base-layer');await expect(surfaces.locator('option')).toHaveCount(3);
 await surfaces.selectOption('satellite');await surfaces.selectOption('topo');
 await page.locator('#map-toggle-itinerary-drawer-btn').click();await expect(page.locator('#map-itinerary-drawer-panel')).toBeVisible();
 expect(await page.locator('#map-explorer-tools').count()).toBe(0);
});
test('a failed national layer stops retrying until the customer explicitly retries',async({page})=>{
 let attempts=0;
 await page.route('**/data/mapa/hospedaje.geojson',route=>{
  attempts++;
  return attempts===1 ? route.fulfill({status:503,body:'Unavailable'}) : route.fulfill({status:200,contentType:'application/geo+json',body:readFileSync('public/data/mapa/hospedaje.geojson','utf8')});
 });
 await page.locator('#national-poi-layers-toggle').click();await page.getByRole('button',{name:'Dormir y comer',exact:true}).click();
 const retry=page.getByRole('button',{name:/Reintentar capa.*Hospedaje/i});await expect(retry).toBeVisible();
 await page.locator('#map-search-input').fill('hotel');await expect(retry).toBeVisible();expect(attempts).toBe(1);
 await retry.click();await expect(retry).toBeHidden();
 await page.locator('#national-poi-layers-panel summary').filter({hasText:'Hospedaje y alimentación'}).click();
 await expect(page.locator('#national-poi-layers-panel')).toContainText(/3[.\s]911 registros/);expect(attempts).toBe(2);
});
