const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// Remove the theme selector from inside the modal
const themeSelectorUI = `
            {showThemeSelector && (
              <div className="absolute top-[70px] right-4 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 w-48 flex flex-col gap-1 max-h-64 overflow-y-auto">
                <div className="text-xs font-bold text-stone-500 mb-1 px-2">{language === 'es' ? 'Selecciona un Tema' : 'Select Theme'}</div>
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setShowThemeSelector(false); }}
                    className={\`text-left text-sm px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors \${theme === key ? 'font-bold bg-stone-50' : ''}\`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={\`w-3 h-3 rounded-full \${t.ping}\`}></div>
                      {t.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
`;

code = code.replace(themeSelectorUI, "");

// Add it outside, above the Palette button
const externalThemeSelector = `
            {showThemeSelector && !isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9, transformOrigin: 'bottom right' }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute bottom-32 right-0 bg-white rounded-xl shadow-2xl border border-stone-200 p-2 z-50 w-56 flex flex-col gap-1 max-h-80 overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-1 px-2">
                   <div className="text-xs font-bold text-stone-500">{language === 'es' ? 'Apariencia de la App' : 'App Theme'}</div>
                   <button onClick={() => setShowThemeSelector(false)} className="text-stone-400 hover:text-stone-700">
                     <X className="w-4 h-4" />
                   </button>
                </div>
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setShowThemeSelector(false); }}
                    className={\`text-left text-sm px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors \${theme === key ? 'font-bold bg-stone-50 border border-stone-200' : 'border border-transparent'}\`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={\`w-3 h-3 rounded-full \${t.ping} shadow-sm border border-black/10\`}></div>
                      <span className="text-stone-700">{t.name}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
`;

code = code.replace(
  "<div className=\"flex flex-col items-center gap-3 pointer-events-auto\">",
  "<div className=\"flex flex-col items-center gap-3 pointer-events-auto relative\">\n" + externalThemeSelector
);

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
console.log('Fixed theme selector location');
