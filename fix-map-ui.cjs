const fs = require('fs');
let content = fs.readFileSync('src/components/InteractiveMap.tsx', 'utf8');

// Fix Map Pins for Tours
const oldTourPin = `        <div class="relative cursor-pointer transition-transform duration-300 \${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          \${isSelected ? '<div class="absolute -inset-2 bg-emerald-400/50 rounded-full animate-ping"></div>' : ''}
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-2xl border-2 \${
            isSelected 
              ? 'bg-emerald-500 border-white text-stone-950 font-black ring-4 ring-emerald-400/40' 
              : 'bg-stone-900/95 border-emerald-500/80 text-white hover:bg-stone-900'
          }">
            <span class="text-xs leading-none">\${emoji}</span>
            <span class="text-[11px] font-bold tracking-tight whitespace-nowrap">\${priceFormatted}</span>
          </div>
          <div class="w-2 h-2 mx-auto rotate-45 -mt-1 \${isSelected ? 'bg-emerald-500 border-r-2 border-b-2 border-white' : 'bg-stone-900'}"></div>
        </div>`;

const newTourPin = `        <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer transition-transform duration-300 \${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          \${isSelected ? '<div class="absolute -inset-2 bg-emerald-500/40 rounded-full animate-ping"></div>' : ''}
          <div class="relative bg-white border-2 \${isSelected ? 'border-emerald-600 shadow-emerald-500/50 shadow-lg' : 'border-emerald-500 shadow-sm'} rounded-full w-full h-full flex items-center justify-center">
            <span class="text-[13px] leading-none">\${emoji}</span>
          </div>
        </div>`;

content = content.replace(oldTourPin, newTourPin);

// Fix Custom Icon Size for Tours
const oldTourIconConf = `      const customIcon = L.divIcon({
        className: 'custom-tour-pin',
        html: htmlString,
        iconSize: [80, 42],
        iconAnchor: [40, 42],
        popupAnchor: [0, -42]
      });`;

const newTourIconConf = `      const customIcon = L.divIcon({
        className: 'custom-tour-pin',
        html: htmlString,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });`;

content = content.replace(oldTourIconConf, newTourIconConf);

// Fix Map Pins for Services
const oldSrvPin = `        <div class="relative cursor-pointer transition-transform duration-300 \${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-25'}">
          \${isSelected ? '<div class="absolute -inset-2 bg-amber-400/60 rounded-full animate-ping"></div>' : ''}
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-2xl border-2 \${
            isSelected 
              ? 'bg-amber-400 border-white text-stone-950 font-black ring-4 ring-amber-400/40' 
              : 'bg-stone-950/95 ' + meta.border + ' text-white hover:bg-stone-900'
          }">
            <span class="text-xs leading-none">\${meta.emoji}</span>
            <span class="text-[10px] font-bold tracking-tight whitespace-nowrap">\${badgeContent}</span>
          </div>
          <div class="w-2 h-2 mx-auto rotate-45 -mt-1 \${isSelected ? 'bg-amber-400 border-r-2 border-b-2 border-white' : 'bg-stone-950'}"></div>
        </div>`;

const newSrvPin = `        <div class="relative flex items-center justify-center w-7 h-7 cursor-pointer transition-transform duration-300 \${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-20'}">
          \${isSelected ? '<div class="absolute -inset-2 bg-slate-400/40 rounded-full animate-ping"></div>' : ''}
          <div class="relative bg-white border-2 \${isSelected ? 'border-slate-800 shadow-slate-500/50 shadow-lg' : meta.border + ' shadow-sm'} rounded-full w-full h-full flex items-center justify-center">
            <span class="text-[11px] leading-none">\${meta.emoji}</span>
          </div>
        </div>`;

content = content.replace(oldSrvPin, newSrvPin);

// Fix Custom Icon Size for Services
const oldSrvIconConf = `      const customIcon = L.divIcon({
        className: \`custom-srv-pin custom-\${srv.type}-pin\`,
        html: htmlString,
        iconSize: [84, 42],
        iconAnchor: [42, 42],
        popupAnchor: [0, -42]
      });`;

const newSrvIconConf = `      const customIcon = L.divIcon({
        className: \`custom-srv-pin custom-\${srv.type}-pin\`,
        html: htmlString,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });`;

content = content.replace(oldSrvIconConf, newSrvIconConf);

// Fix Layer Pills Styles
content = content.replace(
  "layerFilters.tours \n                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.tours ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);
content = content.replace(
  "layerFilters.hotels \n                      ? 'bg-amber-500 text-white border-amber-400 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.hotels ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);
content = content.replace(
  "layerFilters.parks \n                      ? 'bg-teal-600 text-white border-teal-500 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.parks ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);
content = content.replace(
  "layerFilters.buses \n                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.buses ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);
content = content.replace(
  "layerFilters.trains \n                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.trains ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);
content = content.replace(
  "layerFilters.taxis \n                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.taxis ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);
content = content.replace(
  "layerFilters.airports \n                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm' \n                      : 'bg-slate-100 border-slate-200 text-slate-500 opacity-70'",
  "layerFilters.airports ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'"
);

fs.writeFileSync('src/components/InteractiveMap.tsx', content);
