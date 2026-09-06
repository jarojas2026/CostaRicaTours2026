const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

const themesCode = `
const THEMES: Record<string, any> = {
  emerald: {
    name: 'Emerald (Standard)',
    button: 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[0_0_20px_rgba(37,211,102,0.4)]',
    header: 'bg-[#1E7B4A]',
    badge: 'bg-[#E67E22] text-white',
    hoverBorder: 'hover:border-[#1E7B4A]',
    iconBg: 'bg-stone-50 group-hover:bg-stone-100',
    ping: 'bg-[#25D366]'
  },
  costa_rica: {
    name: 'Costa Rica Pura Vida',
    button: 'bg-[#E63946] hover:bg-[#D62828] shadow-[0_0_20px_rgba(230,57,70,0.4)]',
    header: 'bg-[#1D3557]',
    badge: 'bg-[#F1FAEE] text-[#1D3557]',
    hoverBorder: 'hover:border-[#E63946]',
    iconBg: 'bg-stone-50 group-hover:bg-[#F1FAEE]',
    ping: 'bg-[#E63946]'
  },
  ocean: {
    name: 'Ocean Blue',
    button: 'bg-[#0077B6] hover:bg-[#023E8A] shadow-[0_0_20px_rgba(0,119,182,0.4)]',
    header: 'bg-[#03045E]',
    badge: 'bg-[#48CAE4] text-white',
    hoverBorder: 'hover:border-[#0077B6]',
    iconBg: 'bg-stone-50 group-hover:bg-[#CAF0F8]',
    ping: 'bg-[#0077B6]'
  },
  sunset: {
    name: 'Tropical Sunset',
    button: 'bg-[#F4A261] hover:bg-[#E76F51] shadow-[0_0_20px_rgba(244,162,97,0.4)]',
    header: 'bg-[#264653]',
    badge: 'bg-[#E9C46A] text-[#264653]',
    hoverBorder: 'hover:border-[#F4A261]',
    iconBg: 'bg-stone-50 group-hover:bg-[#F4A261]/10',
    ping: 'bg-[#F4A261]'
  },
  volcano: {
    name: 'Arenal Volcano',
    button: 'bg-[#D00000] hover:bg-[#9D0208] shadow-[0_0_20px_rgba(208,0,0,0.4)]',
    header: 'bg-[#370617]',
    badge: 'bg-[#FFBA08] text-[#370617]',
    hoverBorder: 'hover:border-[#D00000]',
    iconBg: 'bg-stone-50 group-hover:bg-[#FFBA08]/10',
    ping: 'bg-[#D00000]'
  },
  rainforest: {
    name: 'Monteverde Rainforest',
    button: 'bg-[#2D6A4F] hover:bg-[#1B4332] shadow-[0_0_20px_rgba(45,106,79,0.4)]',
    header: 'bg-[#081C15]',
    badge: 'bg-[#74C69D] text-[#081C15]',
    hoverBorder: 'hover:border-[#2D6A4F]',
    iconBg: 'bg-stone-50 group-hover:bg-[#74C69D]/10',
    ping: 'bg-[#2D6A4F]'
  },
  orchid: {
    name: 'Wild Orchid',
    button: 'bg-[#9D4EDD] hover:bg-[#7B2CBF] shadow-[0_0_20px_rgba(157,78,221,0.4)]',
    header: 'bg-[#3C096C]',
    badge: 'bg-[#E0AAFF] text-[#3C096C]',
    hoverBorder: 'hover:border-[#9D4EDD]',
    iconBg: 'bg-stone-50 group-hover:bg-[#E0AAFF]/10',
    ping: 'bg-[#9D4EDD]'
  },
  gold: {
    name: 'Luxury Gold',
    button: 'bg-[#D4AF37] hover:bg-[#AA8C2C] shadow-[0_0_20px_rgba(212,175,55,0.4)]',
    header: 'bg-[#1A1A1A]',
    badge: 'bg-[#FFFFFF] text-[#1A1A1A]',
    hoverBorder: 'hover:border-[#D4AF37]',
    iconBg: 'bg-stone-50 group-hover:bg-[#D4AF37]/10',
    ping: 'bg-[#D4AF37]'
  },
  minimalist: {
    name: 'Minimalist Monochrome',
    button: 'bg-[#4A4A4A] hover:bg-[#2D2D2D] shadow-[0_0_20px_rgba(74,74,74,0.4)]',
    header: 'bg-[#111111]',
    badge: 'bg-[#E0E0E0] text-[#111111]',
    hoverBorder: 'hover:border-[#4A4A4A]',
    iconBg: 'bg-stone-50 group-hover:bg-[#E0E0E0]/20',
    ping: 'bg-[#4A4A4A]'
  },
  sky: {
    name: 'Clear Sky',
    button: 'bg-[#00B4D8] hover:bg-[#0096C7] shadow-[0_0_20px_rgba(0,180,216,0.4)]',
    header: 'bg-[#03045E]',
    badge: 'bg-[#90E0EF] text-[#03045E]',
    hoverBorder: 'hover:border-[#00B4D8]',
    iconBg: 'bg-stone-50 group-hover:bg-[#90E0EF]/20',
    ping: 'bg-[#00B4D8]'
  }
};
`;

code = code.replace("const keywordsToTourId", themesCode + "\nconst keywordsToTourId");

code = code.replace(
  "const [theme, setTheme] = useState<'emerald' | 'teal'>('emerald');",
  "const [theme, setTheme] = useState<string>('emerald');\n  const [showThemeSelector, setShowThemeSelector] = useState(false);"
);

code = code.replace(
  "const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>(() => {",
  "const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string, quickActions?: {label: string, action: string, data?: any}[] }[]>(() => {"
);

code = code.replace(
  "const themeClasses = {",
  "const themeClasses = THEMES[theme] || THEMES.emerald;\n  const _ignore = {"
);

// We need to inject quickActions inside the N8N fallback and Triage processing
// Wait, the quick action UI is easiest if we add an onClick on the quick action buttons that just populates chatInput or directly calls handleSendMessage.
// We can define a `handleQuickAction` inside the component.

const quickActionFunction = `
  const handleQuickAction = (action: string, data?: any) => {
    if (action === 'send_message') {
      setChatInput(data.message);
      // We can also auto-send it
      setTimeout(() => {
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 50);
    } else if (action === 'book') {
      setChatInput(language === 'es' ? 'Quiero reservar' : 'I want to book');
      setTimeout(() => {
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 50);
    }
  };
`;

code = code.replace("const handleSendMessage = async", quickActionFunction + "\n  const handleSendMessage = async");

// Replace the fallback / triage logic to add quick actions
const triageReplacement = `
        // SIMULATION LOGIC FOR PROGRESS INDICATOR
        let quickActions: any[] = [];
        if (msg.toLowerCase().includes('precio') || msg.toLowerCase().includes('price') || msg.toLowerCase().includes('cost')) {
            quickActions = [
              { label: language === 'es' ? '📅 Reservar Ahora' : '📅 Book Now', action: 'book' },
              { label: language === 'es' ? '🔍 Ver Detalles' : '🔍 See Details', action: 'send_message', data: { message: language === 'es' ? 'Ver detalles de tours' : 'See tour details' } }
            ];
        } else if (msg.toLowerCase().includes('reserv') || msg.toLowerCase().includes('book')) {
`;
code = code.replace("        // SIMULATION LOGIC FOR PROGRESS INDICATOR\n        if (msg.toLowerCase().includes('reserv') || msg.toLowerCase().includes('book')) {", triageReplacement);

const triageUpdateHistory = `
          const newHistory = [...prev, { role: 'bot' as const, text: replyText, quickActions }];
          return newHistory.slice(-50);
`;
code = code.replace(
  "const newHistory = [...prev, { role: 'bot' as const, text: replyText }];\n          return newHistory.slice(-50);",
  triageUpdateHistory
);

// We also need to process the n8n webhook response to use quickActions if returned
const n8nUpdateHistory = `
        const quickActions = data.quickActions || [];
        const newHistory = [...prev, { role: 'bot' as const, text: replyText, quickActions }];
        return newHistory.slice(-50);
`;
code = code.replace(
  "const newHistory = [...prev, { role: 'bot' as const, text: replyText }];\n        return newHistory.slice(-50);",
  n8nUpdateHistory
);

// We need to render the quickActions in the chat UI
const quickActionsRender = `
                      <div className={\`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium \${msg.role === 'user' ? themeClasses.button + ' text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-md text-neutral-800 border border-neutral-200/60 rounded-tl-sm'}\`}>
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                        <MessageStatus isBot={msg.role === 'bot'} />
                      </div>
                      {msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 ml-1">
                          {msg.quickActions.map((qa, qaid) => (
                            <button 
                              key={qaid}
                              onClick={() => handleQuickAction(qa.action, qa.data)}
                              className={\`text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200 bg-white shadow-sm hover:\${themeClasses.button} hover:text-white transition-colors duration-200 text-stone-700\`}
                            >
                              {qa.label}
                            </button>
                          ))}
                        </div>
                      )}
`;

code = code.replace(
  /<div className=\{`p-3 rounded-2xl max-w-\[90%\] shadow-sm text-sm font-medium \$\{msg.role === 'user' \? 'bg-\[#25D366\] text-white rounded-tr-sm' : 'bg-white\/80 backdrop-blur-md text-neutral-800 border border-neutral-200\/60 rounded-tl-sm'\}`\}>\s*<span className="whitespace-pre-wrap">\{msg\.text\}<\/span>\s*<MessageStatus isBot=\{msg\.role === 'bot'\} \/>\s*<\/div>/g,
  quickActionsRender
);

// Fix the form ID
code = code.replace(
  "<form onSubmit={handleSendMessage}",
  "<form id=\"chat-form\" onSubmit={handleSendMessage}"
);

// Add the theme selector UI
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
            {/* Chat Body */}
`;

code = code.replace("{/* Chat Body */}", themeSelectorUI);

// Update the theme toggle button to show the selector
code = code.replace(
  "onClick={() => setTheme(theme === 'emerald' ? 'teal' : 'emerald')}",
  "onClick={() => setShowThemeSelector(!showThemeSelector)}"
);

code = code.replace(
  "theme === 'teal' ? 'bg-teal-600 hover:bg-teal-600' : 'bg-orange-500 hover:bg-teal-600'",
  "showThemeSelector ? 'bg-stone-700 hover:bg-stone-800' : themeClasses.header"
);

// Wait, the "Chat Mini Card pulse" uses specific hardcoded colors.
// Let's replace those with dynamic colors if possible, but that might be complex.
// The user avatar green bg is also hardcoded. Let's fix that.
code = code.replace(
  "className=\"w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm\"",
  "className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm`}"
);

code = code.replace(
  "bg-[#25D366] text-white rounded-tr-sm",
  "${themeClasses.button} text-white rounded-tr-sm"
);

// We need to write this back
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
console.log('Patched successfully');
