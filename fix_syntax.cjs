const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

const idx = code.lastIndexOf('<div className="flex flex-col items-center gap-3 pointer-events-auto relative">');

if (idx !== -1) {
    const newBottomPart = `
      <div className="flex flex-col items-center gap-3 pointer-events-auto relative">
        <div className="relative">
          {needsAttention && !isOpen && (
            <div className={\`absolute inset-0 \${themeClasses.ping} rounded-full animate-ping opacity-40 transition-colors duration-300\`}></div>
          )}
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setNeedsAttention(false);
            }}
            aria-label="Toggle WhatsApp Chat"
            className={\`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 \${
              isOpen ? 'bg-stone-50 text-stone-900 hover:scale-105' : '\${themeClasses.button} text-white hover:scale-110 active:scale-95'
            } \${needsAttention && !isOpen ? 'animate-pulse' : ''}\`}
          >
            {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-9 h-9 fill-white/20 stroke-white" />}
            
            {!isOpen && (
              <span className={\`absolute -top-2 -right-2 \${themeClasses.badge} text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-white whitespace-nowrap animate-bounce transition-colors duration-300\`}>
                {badgeText}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
`;

    code = code.substring(0, idx) + newBottomPart;
    fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
    console.log("Syntax fixed");
} else {
    console.log("Could not find blocks");
}

