const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetContent = `// 1. Trigger: CONSULTA_CHAT_IA
app.post('/webhook/chat-consulta', async (req, res) => {
  const { mensaje, message, idioma, language, contexto, context, agenteSeleccionado } = req.body;
  const userMsg = mensaje || message || '';
  const lang = (idioma || language || 'es') as 'es' | 'en';
  const chatHistory = contexto?.historialChat || context?.chatHistory || [];

  // Intento de despacho prioritario a n8n si hay webhook configurado
  const n8nResult = await dispatchToN8N('/webhook/chat-consulta', req.body);

  if (n8nResult.success && n8nResult.data) {
    const data = n8nResult.data;
    const reply = data.reply || data.mensaje || data.output || data.response || null;
    if (reply) {
      return res.json({
        exito: true,
        datos: {
          reply,
          quickActions: data.quickActions || [],
          agente: agenteSeleccionado || 'n8n_agent',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Fallback inteligente con el Asistente Oficial de Costa Rica Tours (Gemini)
  const assistantResult = await processChatInquiry(userMsg, lang, chatHistory);
  
  res.json({
    exito: true,
    datos: {
      reply: assistantResult.reply,
      quickActions: assistantResult.quickActions,
      agente: 'gemini_fallback',
      timestamp: new Date().toISOString()
    }
  });
});`;

const newContent = `// 1. Trigger: OMNICANAL_UNIFICADO (WF-01 WhatsApp, IG, Messenger, Gmail, Web)
app.post('/webhook/chat-consulta', async (req, res) => {
  console.log('🌐 Recibiendo payload omnicanal entrante...');
  
  // Estandarización de payload proveniente de múltiples fuentes
  const origin = req.body.origin || req.body.source || req.headers['x-source-channel'] || 'web_widget';
  const userMsg = req.body.mensaje || req.body.message || req.body.text || req.body.body || '';
  const lang = (req.body.idioma || req.body.language || 'es') as 'es' | 'en';
  const senderId = req.body.senderId || req.body.from || req.body.phone || 'anonymous_user';
  const chatHistory = req.body.contexto?.historialChat || req.body.context?.chatHistory || [];
  const senderName = req.body.senderName || req.body.name || req.body.profileName || 'Turista';

  const unifiedPayload = {
    trigger: 'CONSULTA_OMNICANAL_IA',
    channel: origin,
    senderId,
    senderName,
    mensaje: userMsg,
    idioma: lang,
    agenteSeleccionado: req.body.agenteSeleccionado || 'concierge',
    historial: chatHistory,
    contexto: req.body.contexto || req.body.context || {},
    timestamp: new Date().toISOString(),
    rawSource: req.body
  };

  // Intento de despacho a n8n (El motor n8n se encargará del enrutamiento complejo)
  const n8nResult = await dispatchToN8N('/webhook/chat-consulta', unifiedPayload);

  if (n8nResult.success && n8nResult.data) {
    const data = n8nResult.data;
    const reply = data.reply || data.mensaje || data.output || data.response || null;
    if (reply) {
      return res.json({
        exito: true,
        fuente: 'n8n_router',
        canal_detectado: origin,
        datos: {
          reply,
          quickActions: data.quickActions || [],
          agente: unifiedPayload.agenteSeleccionado,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Fallback inteligente directo a IA si n8n no está disponible
  console.warn(\`⚠️ Enrutando mensaje de \${origin} directamente a Vertex IA / Gemini...\`);
  const assistantResult = await processChatInquiry(userMsg, lang, chatHistory);
  
  res.json({
    exito: true,
    fuente: 'direct_ai_fallback',
    canal_detectado: origin,
    datos: {
      reply: assistantResult.reply,
      quickActions: assistantResult.quickActions,
      agente: 'gemini_vertex_fallback',
      timestamp: new Date().toISOString()
    }
  });
});`;

content = content.replace(targetContent, newContent);
fs.writeFileSync('server.ts', content);
