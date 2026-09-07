const fs = require('fs');
let code = fs.readFileSync('src/components/AIAssistant.tsx', 'utf8');

// 2. Fix Chat input
// Find textarea or input for chat
code = code.replace(/<textarea([^>]*?)>/g, '<textarea$1 spellCheck="false" autoComplete="off" autoCorrect="off">');
code = code.replace(/<input([^>]*?)type="text"([^>]*?)>/g, '<input$1type="text"$2 spellCheck="false" autoComplete="off" autoCorrect="off">');

// 7. Welcome message
// Check initial state of messages.
// const [messages, setMessages] = useState<Message[]>([])
const welcomeMessage = `{ id: 'welcome', role: 'assistant', content: '¡Hola! Soy Valeria, tu asesora experta en Costa Rica 🇨🇷. ¿En qué puedo ayudarte a planear tu viaje perfecto hoy?', timestamp: new Date() }`;
code = code.replace(/useState<Message\[\]>\(\[\]\)/g, `useState<Message[]>([${welcomeMessage}])`);

// 8. Fix chat suggestions overflow
// Find the suggestions container
code = code.replace(/className="flex flex-wrap gap-2"/g, 'className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar whitespace-nowrap"');
code = code.replace(/className="flex flex-wrap items-center gap-2"/g, 'className="flex overflow-x-auto items-center gap-2 pb-2 hide-scrollbar whitespace-nowrap"');

fs.writeFileSync('src/components/AIAssistant.tsx', code);
