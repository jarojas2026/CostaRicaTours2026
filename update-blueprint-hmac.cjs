const fs = require('fs');
let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

const oldCode = `const body = $input.item.json.body || $input.item.json;\\nconst token = $input.item.json.headers?.['x-webhook-secret'] || 'valid_token';\\nreturn { json: { ...body, authenticated: true, receivedAt: new Date().toISOString() } };`;
const newCode = `const crypto = require('crypto');\\nconst body = $input.item.json.body || $input.item.json;\\nconst signature = $input.item.json.headers?.['x-webhook-signature'];\\nconst secret = 'dev-secret-key-123';\\nconst hash = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');\\nif(hash !== signature && signature !== undefined) throw new Error('Invalid HMAC Signature');\\nreturn { json: { ...body, authenticated: true, receivedAt: new Date().toISOString() } };`;

content = content.replace(new RegExp(oldCode.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), newCode);

fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
