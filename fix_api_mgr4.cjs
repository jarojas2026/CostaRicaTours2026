const fs = require('fs');

const file = 'src/lib/apiManager.ts';
let code = fs.readFileSync(file, 'utf8');

const correctTop = `
/**
 * API MANAGER - Costa Rica Tours
 * Gestor centralizado para comunicaciones con n8n y APIs externas
 */

// 1. SISTEMA DE CONFIGURACIÓN CENTRALIZADA
const ENV = 'development';

export const API_CONFIG = {
  n8n: {
    // Reemplaza con la URL base real de tu webhook de n8n
    baseUrl: ENV === 'production' 
      ? 'https://tu-instancia-n8n.webhook/production/' 
      : 'https://tu-instancia-n8n.webhook/test/',
    webhookSecret: import.meta.env?.VITE_N8N_WEBHOOK_SECRET || 'dev-secret-key-123'
  },
  pagos: {
    stripe: {
      publicKey: import.meta.env?.VITE_STRIPE_PUBLIC_KEY || 'pk_test_123'
    }
  }
};
`;

// Find the index of `// 2. CLIENTE HTTP UNIFICADO` and replace everything before it.
const startIdx = code.indexOf('// 2. CLIENTE HTTP UNIFICADO');
if (startIdx !== -1) {
    code = correctTop + '\n' + code.substring(startIdx);
    fs.writeFileSync(file, code);
}
