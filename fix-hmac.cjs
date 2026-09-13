const fs = require('fs');
let content = fs.readFileSync('backend/n8nService.ts', 'utf8');

if (!content.includes("import crypto from 'crypto';")) {
  content = "import crypto from 'crypto';\n" + content;
}

// Replace the hardcoded secret header in dispatchToN8N with a dynamically generated HMAC hash
const oldHeadersBlock = `  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': config.webhookSecret,
    'User-Agent': 'CostaRicaTours-Backend/1.0'
  };`;

const newHeadersBlock = `  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payloadString)
    .digest('hex');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Secret': config.webhookSecret, // Legacy fallback
    'User-Agent': 'CostaRicaTours-Backend/1.0'
  };`;

content = content.replace(oldHeadersBlock, newHeadersBlock);

// Replace JSON.stringify(payload) with payloadString in fetch body
content = content.replace("body: JSON.stringify(payload),", "body: payloadString,");

fs.writeFileSync('backend/n8nService.ts', content);
