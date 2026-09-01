const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add imports
content = content.replace("import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS }", "import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from '../utils/i18n';\nimport { CURRENCIES }");

// Add state
content = content.replace("const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);", "const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);\n  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);");

// Replace the currency div
const regex = /\{\/\* Multi-Currency Toggle \/ Dropdown \*\/\}[\s\S]*?\{\/\* Multi-Language Selector Dropdown \*\/\}/m;

const replacement = `{/* Multi-Currency Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
              className="flex items-center gap-1.5 bg-orange-700/50 hover:bg-orange-700 px-2.5 py-1 rounded-full border border-orange-500 text-[11px] font-bold transition-colors cursor-pointer shadow-sm"
              title="Select Currency"
            >
              <span className="text-white uppercase font-black">{currency}</span>
              <ChevronDown className={\`w-3 h-3 text-orange-200 transition-transform \${isCurrencyMenuOpen ? 'rotate-180' : ''}\`} />
            </button>

            {isCurrencyMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCurrencyMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-xl border border-neutral-100 z-50 animate-fade-in modal-scrollable">
                  <div className="p-2 border-b border-neutral-100 bg-neutral-50/80 backdrop-blur-sm sticky top-0">
                    <span className="text-[10px] font-black text-neutral-400 uppercase px-2">
                      {language === 'es' ? 'Moneda' : 'Currency'}
                    </span>
                  </div>
                  {CURRENCIES.map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        setCurrency(curr);
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={\`w-full text-left px-3 py-2 text-xs font-bold transition-colors \${
                        currency === curr
                          ? 'bg-orange-50 text-orange-400'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }\`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Multi-Language Selector Dropdown */}`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/Header.tsx', content);
console.log('patched header currency');
