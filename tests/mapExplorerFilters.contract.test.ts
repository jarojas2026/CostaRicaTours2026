import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesMapSearch, matchesMapSpatialFilter, matchesNationalPoi, matchesTourDuration, type NationalPoiFeature, type MapSpatialFilter } from '../src/utils/mapExplorerFilters.ts';
import { loadNationalPoiData } from '../src/utils/nationalPoiData.ts';
import type { Tour } from '../src/types.ts';
const spatial:MapSpatialFilter={viewport:{center:[9.93,-84.08],bounds:[9.8,-84.2,10,-83.9],zoom:12},onlyInView:true,radiusKm:null};
const poi:NationalPoiFeature={type:'Feature',geometry:{type:'Point',coordinates:[-84.08,9.93]},properties:{id:'test',grupo:'atracciones',tipo:'Atracción',nombre:'Mirador del volcán Poás'}};
test('map search normalizes accents and checks every token across fields',()=>{
 assert(matchesMapSearch('poas MIRADOR',[poi.properties.nombre]));
 assert(matchesMapSearch('CAFÉ museo',['Museo','Café rural']));
 assert(!matchesMapSearch('poas hospital',[poi.properties.nombre]));
 assert(matchesMapSearch('  ',[]));
});
test('map spatial filters combine viewport and radius without inventing coordinates',()=>{
 assert(matchesMapSpatialFilter([9.93,-84.08],spatial));
 assert(!matchesMapSpatialFilter([10.3,-84.8],spatial));
 assert(!matchesMapSpatialFilter(null,spatial));
 assert(!matchesMapSpatialFilter([NaN,-84],spatial));
 assert(matchesMapSpatialFilter([9.935,-84.08],{...spatial,radiusKm:5}));
 assert(!matchesMapSpatialFilter([9.99,-84.08],{...spatial,radiusKm:5}));
 assert(matchesMapSpatialFilter([5.53,-87.06],{...spatial,onlyInView:false}));
});
test('national filters combine place type, approximate flag, search and area',()=>{
 assert(matchesNationalPoi(poi,'poas','Atracción',false,spatial));
 assert(!matchesNationalPoi(poi,'poas','Museo',false,spatial));
 assert(!matchesNationalPoi({...poi,properties:{...poi.properties,aprox:true}},'','all',true,spatial));
 assert(matchesNationalPoi(poi,'','all',true,spatial));
});
test('maximum duration excludes unknown and invalid duration rather than assuming it fits',()=>{
 assert(matchesTourDuration({durationHours:4} as Tour,4));
 assert(!matchesTourDuration({durationHours:5} as Tour,4));
 assert(!matchesTourDuration({durationHours:0} as Tour,4));
 assert(!matchesTourDuration({durationHours:NaN} as Tour,4));
 assert(matchesTourDuration({durationHours:0} as Tour,null));
});
test('layer fetches deduplicate concurrent requests, reject malformed data and allow deliberate retry',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({type:'FeatureCollection',features:[poi,{...poi,geometry:{type:'Point',coordinates:[200,95]}}]}));};
 try {
  const [a,b]=await Promise.all([loadNationalPoiData('atracciones'),loadNationalPoiData('atracciones')]);
  assert.equal(calls,1);assert.equal(a,b);assert.equal(a.length,1);
  await loadNationalPoiData('atracciones');assert.equal(calls,1);
  globalThis.fetch=async()=>{calls++;return new Response('failed',{status:503});};
  await assert.rejects(loadNationalPoiData('fauna'));const failedCalls=calls;
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,failedCalls,'the loader must not auto-retry failed requests');
  globalThis.fetch=async()=>new Response(JSON.stringify({type:'FeatureCollection',features:[]}));
  assert.deepEqual(await loadNationalPoiData('fauna'),[]);
 } finally {globalThis.fetch=original;}
});
