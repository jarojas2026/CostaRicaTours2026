const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.ts', 'utf8');

const additions = `
  aiMemoryTurn: { es: 'turnos recordados', en: 'turns remembered', de: 'erinnerte Runden', fr: 'tours mémorisés', zh: '记住的轮次', ja: '記憶されたターン' },
  aiMemorySync: { es: 'reserva(s) sincronizada(s)', en: 'booking(s) synced', de: 'Buchung(en) synchronisiert', fr: 'réservation(s) synchronisée(s)', zh: '预订已同步', ja: '予約が同期されました' },
  aiMemoryReady: { es: 'Gemini 3.6 Flash • Listo para ayudarte', en: 'Gemini 3.6 Flash • Ready to help', de: 'Gemini 3.6 Flash • Bereit zu helfen', fr: 'Gemini 3.6 Flash • Prêt à vous aider', zh: 'Gemini 3.6 Flash • 准备好为您服务', ja: 'Gemini 3.6 Flash • お手伝いの準備ができています' },
  aiClearChat: { es: 'Reiniciar conversación', en: 'Clear chat history', de: 'Chatverlauf löschen', fr: 'Effacer l\\'historique du chat', zh: '清除聊天记录', ja: 'チャット履歴をクリア' },
  aiSend: { es: 'Enviar', en: 'Send', de: 'Senden', fr: 'Envoyer', zh: '发送', ja: '送信' },
  aiConsulting: { es: 'Consultando memoria y asistente Gemini...', en: 'Consulting context and Gemini AI agent...', de: 'Kontext und Gemini-KI-Agent werden konsultiert...', fr: 'Consultation du contexte et de l\\'agent IA Gemini...', zh: '正在咨询上下文和 Gemini AI 助手...', ja: 'コンテキストと Gemini AI エージェントに相談中...' },
`;

content = content.replace('};', additions + '\n};');
fs.writeFileSync('src/utils/i18n.ts', content);

let ai = fs.readFileSync('src/components/AIAssistant.tsx', 'utf8');

ai = ai.replace(/language === 'es' \? 'turnos recordados' : 'turns remembered'/g, "t('aiMemoryTurn')");
ai = ai.replace(/language === 'es' \? \`\$\{userBookings.length\} reserva\(s\) sincronizada\(s\)\` : \`\$\{userBookings.length\} booking\(s\) synced\`/g, "`${userBookings.length} ` + t('aiMemorySync')");
ai = ai.replace(/language === 'es' \? 'Gemini 3.6 Flash • Listo para ayudarte' : 'Gemini 3.6 Flash • Ready to help'/g, "t('aiMemoryReady')");
ai = ai.replace(/language === 'es' \? 'Reiniciar conversación' : 'Clear chat history'/g, "t('aiClearChat')");
ai = ai.replace(/language === 'es' \? 'Enviar' : 'Send'/g, "t('aiSend')");
ai = ai.replace(/language === 'es' \? 'Consultando memoria y asistente Gemini\.\.\.' : 'Consulting context and Gemini AI agent\.\.\.'/g, "t('aiConsulting')");

if (!ai.includes('const t = (key: string)')) {
  ai = ai.replace(
    /(const \[.*\] = useState.*)/,
    "const t = (key: string) => UI_TRANSLATIONS[key]?.[language] || UI_TRANSLATIONS[key]?.['es'] || key;\n  $1"
  );
}
fs.writeFileSync('src/components/AIAssistant.tsx', ai);
console.log('patched ai');
