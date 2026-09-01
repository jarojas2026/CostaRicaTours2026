const fs = require('fs');
let content = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

const stateVar = `  const [chatInput, setChatInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [isSendingToWebhook, setIsSendingToWebhook] = useState(false);`;

content = content.replace(/  const \[chatInput, setChatInput\] = useState\(''\);\s*const \[showTyping, setShowTyping\] = useState\(false\);/, stateVar);

const oldFunc = `  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const msg = chatInput.trim();

    if (!isOnline) {
      setOfflineAttemptNotice(true);
      setChatHistory(prev => {
        const newHistory = [
          ...prev, 
          { role: 'user' as const, text: msg },
          { 
            role: 'bot' as const, 
            text: language === 'es'
              ? '⚠️ [Modo Offline] Mensaje registrado en tu historial. Al no contar con conexión a Internet activa, tu WhatsApp se abrirá automáticamente en cuanto se restablezca la red.'
              : '⚠️ [Offline Mode] Message recorded. As there is no active Internet connection, your WhatsApp conversation will open once the network is restored.'
          }
        ];
        return newHistory.slice(-50);
      });
      setChatInput('');
      return;
    }

    setChatHistory(prev => {
      const newHistory = [...prev, { role: 'user' as const, text: msg }];
      return newHistory.slice(-50);
    });
    
    const text = encodeURIComponent(msg);
    const whatsappUrl = \`https://wa.me/50687959148?text=\${text}\`;
    window.open(whatsappUrl, '_blank');
    setChatInput('');
  };`;

const newFunc = `  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingToWebhook) return;
    
    const msg = chatInput.trim();

    if (!isOnline) {
      setOfflineAttemptNotice(true);
      setChatHistory(prev => {
        const newHistory = [
          ...prev, 
          { role: 'user' as const, text: msg },
          { 
            role: 'bot' as const, 
            text: language === 'es'
              ? '⚠️ [Modo Offline] Mensaje registrado en tu historial. Al no contar con conexión a Internet activa, se enviará en cuanto se restablezca la red.'
              : '⚠️ [Offline Mode] Message recorded. As there is no active Internet connection, it will be sent once the network is restored.'
          }
        ];
        return newHistory.slice(-50);
      });
      setChatInput('');
      return;
    }

    setChatHistory(prev => {
      const newHistory = [...prev, { role: 'user' as const, text: msg }];
      return newHistory.slice(-50);
    });
    
    setChatInput('');
    setIsSendingToWebhook(true);

    try {
      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://tu-n8n.com/webhook/whatsapp-chat';
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           message: msg, 
           language,
           source: 'website_chat',
           timestamp: new Date().toISOString()
        })
      });

      if (!response.ok && n8nWebhookUrl.includes('tu-n8n.com')) {
         throw new Error("Simulated Webhook");
      }
      
      const data = await response.json().catch(() => ({}));
      
      setChatHistory(prev => {
        const replyText = data.reply || (language === 'es' ? '🤖 ¡Mensaje recibido! Nuestro agente n8n lo está procesando...' : '🤖 Message received! Our n8n agent is processing it...');
        const newHistory = [...prev, { role: 'bot' as const, text: replyText }];
        return newHistory.slice(-50);
      });
      
    } catch (error) {
      // Fallback for simulation purposes: call our local agent Triage/Processor
      try {
        const triageRes = await fetch('/api/agents/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawMessage: msg })
        });
        const triageData = await triageRes.json();
        
        const procRes = await fetch('/api/agents/processor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawMessage: msg, intent: triageData.intent, extractedData: triageData.extractedData })
        });
        const procData = await procRes.json();

        setChatHistory(prev => {
          const replyText = procData.draftResponse || (language === 'es' ? 'Mensaje procesado en backend.' : 'Message processed in backend.');
          const newHistory = [...prev, { role: 'bot' as const, text: replyText }];
          return newHistory.slice(-50);
        });
      } catch (innerError) {
         setChatHistory(prev => {
            const newHistory = [...prev, { role: 'bot' as const, text: language === 'es' ? '⚠️ Error al contactar al Agente N8N o Backend.' : '⚠️ Error contacting N8N or Backend Agent.' }];
            return newHistory.slice(-50);
         });
      }
    } finally {
      setIsSendingToWebhook(false);
    }
  };`;

content = content.replace(oldFunc, newFunc);

// Find submit button and update disabled state and loading spinner
content = content.replace(
  /disabled={!chatInput.trim()}/,
  'disabled={!chatInput.trim() || isSendingToWebhook}'
);

content = content.replace(
  /<ChevronRight className="w-5 h-5 ml-0\.5" \/>/g,
  `{isSendingToWebhook ? <Sparkles className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5 ml-0.5" />}`
);

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', content);
