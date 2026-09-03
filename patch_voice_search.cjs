const fs = require('fs');

let content = fs.readFileSync('src/components/ToursGrid.tsx', 'utf8');

if (!content.includes('Mic')) {
  // 1. Add Mic to lucide-react imports
  content = content.replace(
    'ArrowUpDown, ArrowLeft',
    'ArrowUpDown, ArrowLeft, Mic, MicOff, Loader2'
  );

  // 2. Add state for voice recording
  content = content.replace(
    'const [currentPage, setCurrentPage] = useState(1);',
    "const [currentPage, setCurrentPage] = useState(1);\n  const [isListening, setIsListening] = useState(false);\n\n  // Voice Search Handler\n  const startVoiceSearch = () => {\n    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;\n    if (!SpeechRecognition) {\n      alert(language === 'es' ? 'Tu navegador no soporta búsqueda por voz. Usa Chrome.' : 'Browser does not support voice search. Use Chrome.');\n      return;\n    }\n    const recognition = new SpeechRecognition();\n    recognition.lang = language === 'es' ? 'es-CR' : 'en-US';\n    recognition.continuous = false;\n    recognition.interimResults = false;\n    \n    recognition.onstart = () => setIsListening(true);\n    recognition.onresult = (event: any) => {\n      const transcript = event.results[0][0].transcript;\n      setSearchQuery(transcript);\n      setIsListening(false);\n    };\n    recognition.onerror = () => setIsListening(false);\n    recognition.onend = () => setIsListening(false);\n    \n    recognition.start();\n  };"
  );

  // 3. Update the Search Box JSX
  // We want to add the Mic button right after the input.
  const searchBoxTarget = `{searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}`;
            
  const newSearchBox = `{searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={startVoiceSearch}
              className={\`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all \${isListening ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'text-neutral-400 hover:text-orange-500 hover:bg-stone-800'}\`}
              title={language === 'es' ? 'Búsqueda por voz' : 'Voice Search'}
            >
              {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            </button>`;

  content = content.replace(searchBoxTarget, newSearchBox);
  
  // also adjust input padding so the mic button doesn't overlap text
  content = content.replace(
    'className="w-full bg-stone-950/40 text-neutral-100 text-sm pl-12 pr-10 py-3.5 rounded-full border border-white/10 focus:outline-none focus:border-orange-500 transition-colors shadow-inner placeholder:text-neutral-400"',
    'className="w-full bg-stone-950/40 text-neutral-100 text-sm pl-12 pr-20 py-3.5 rounded-full border border-white/10 focus:outline-none focus:border-orange-500 transition-colors shadow-inner placeholder:text-neutral-400"'
  );

  fs.writeFileSync('src/components/ToursGrid.tsx', content);
  console.log('Voice search added');
} else {
  console.log('Mic already imported');
}
