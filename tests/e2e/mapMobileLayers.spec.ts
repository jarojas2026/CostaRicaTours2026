import { devices } from '@playwright/test';
import { expect, mockApi, test } from './fixtures';
const VIEWPORT={width:390,height:844};
const {defaultBrowserType:_ignored,viewport:_v,...iphone}=devices['iPhone 13'];
test.use({...iphone,viewport:VIEWPORT});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{if(window===window.top)window.localStorage.setItem('cookie-consent','essential');});
 await mockApi(page);await page.goto('/map');
 await expect(page.locator('#costa-rica-leaflet-map-canvas.leaflet-container')).toBeVisible();
});
test('mobile layers dock reserves space and never overlaps the map',async({page})=>{
 const toggle=page.locator('#national-poi-layers-toggle'),panel=page.locator('#map-explorer-filters'),map=page.locator('#costa-rica-leaflet-map-canvas');
 await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.tap();
 await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(panel).toBeVisible();
 await expect.poll(async()=>{const p=(await panel.boundingBox())!,m=(await map.boundingBox())!;return m.y+m.height<=p.y+2;}).toBe(true);
 const box=(await panel.boundingBox())!;
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(VIEWPORT.width+1);
 expect(box.height).toBeLessThanOrEqual(VIEWPORT.height/2);
 expect((await map.boundingBox())!.height).toBeGreaterThanOrEqual(210);
 await panel.hover();await page.mouse.wheel(0,650);await expect.poll(()=>panel.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Cerrar selector de capas',exact:true}).tap();await expect(panel).toBeHidden();
});
test('dock closes with Escape or map background and can be toggled again',async({page})=>{
 const toggle=page.locator('#national-poi-layers-toggle'),panel=page.locator('#map-explorer-filters');
 await toggle.tap();await page.keyboard.press('Escape');await expect(panel).toBeHidden();
 await toggle.tap();const map=(await page.locator('#costa-rica-leaflet-map-canvas').boundingBox())!;
 await page.touchscreen.tap(map.x+30,map.y+30);await expect(panel).toBeHidden();
 await toggle.tap();await expect(panel).toBeVisible();await toggle.tap();await expect(panel).toBeHidden();
});
test('mobile tools and calculator preserve visible geography and page width',async({page})=>{
 await page.locator('#map-tools-toggle').tap();await page.locator('#map-toggle-calculator-btn').tap();
 const panel=page.locator('#map-calculator-panel'),map=page.locator('#costa-rica-leaflet-map-canvas');await expect(panel).toBeVisible();
 const p=(await panel.boundingBox())!,m=(await map.boundingBox())!;expect(m.y+m.height).toBeLessThanOrEqual(p.y+2);
 await page.getByRole('button',{name:'Cerrar calculadora',exact:true}).tap();await expect(panel).toBeHidden();
 const sizes=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width);
});
