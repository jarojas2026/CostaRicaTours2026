const fs = require('fs');
let content = fs.readFileSync('src/components/InteractiveMap.tsx', 'utf8');

const oldFabClass = "w-11 h-11 bg-[#06241a]/95 hover:bg-emerald-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-100 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95";
const newFabClass = "w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95";

content = content.split(oldFabClass + ' disabled:opacity-50').join(newFabClass + ' disabled:opacity-50');
content = content.split(oldFabClass).join(newFabClass);

content = content.split('<Compass className="w-5 h-5 text-emerald-400" />').join('<Compass className="w-4 h-4" />');
content = content.split('className={`w-5 h-5 ${gpsLoading ? \'animate-spin text-amber-400\' : \'text-emerald-400\'}`}').join('className={`w-4 h-4 ${gpsLoading ? \'animate-spin text-amber-500\' : \'\'}`}');
content = content.split('<Plus className="w-5 h-5" />').join('<Plus className="w-4 h-4" />');
content = content.split('<Minus className="w-5 h-5" />').join('<Minus className="w-4 h-4" />');
content = content.split('<Minimize2 className="w-5 h-5" />').join('<Minimize2 className="w-4 h-4" />');
content = content.split('<Maximize2 className="w-5 h-5" />').join('<Maximize2 className="w-4 h-4" />');

const badgeText = `          {/* Zoom Level Badge */}
          <div className="bg-black/60 backdrop-blur-md border border-emerald-500/20 px-2 py-1 rounded-lg text-[10px] font-mono text-emerald-300 text-center">
            {currentZoom}x
          </div>`;
content = content.split(badgeText).join('');

fs.writeFileSync('src/components/InteractiveMap.tsx', content);
