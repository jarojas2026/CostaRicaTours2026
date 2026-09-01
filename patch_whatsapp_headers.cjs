const fs = require('fs');
let content = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

const oldFetch = `      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://tu-n8n.com/webhook/whatsapp-chat';
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           message: msg, 
           language,
           source: 'website_chat',
           timestamp: new Date().toISOString()
        })
      });`;

const newFetch = `      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://tu-n8n.com/webhook/whatsapp-chat';
      const n8nApiKey = import.meta.env.VITE_N8N_API_KEY;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (n8nApiKey) {
        // Secure API Key authentication for n8n Webhook validation
        headers['Authorization'] = \`Bearer \${n8nApiKey}\`;
        // Alternatively, use a custom header if configured in n8n
        // headers['X-N8N-API-KEY'] = n8nApiKey;
      }
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
           message: msg, 
           language,
           source: 'website_chat',
           timestamp: new Date().toISOString()
        })
      });`;

content = content.replace(oldFetch, newFetch);
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', content);
