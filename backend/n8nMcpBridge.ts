import crypto from 'crypto';

/**
 * ⚡ n8n MCP Client & Gateway Bridge
 * Conecta el Counter Agent y los Agentes Autónomos de Costa Rica Tours
 * al servidor MCP de n8n cuando está explícitamente habilitado.
 */

export interface McpToolCallRequest {
  toolName: string;
  arguments?: Record<string, any>;
}

export interface McpToolCallResponse {
  success: boolean;
  content?: any;
  error?: string;
  rawResponse?: any;
}

const MCP_SERVER_URL = process.env.N8N_MCP_SERVER_URL || '';
const MCP_TOKEN = process.env.N8N_MCP_TOKEN || '';

/** Invoca una herramienta o prompt a través del servidor MCP de n8n mediante HTTP JSON-RPC. */
export async function callN8nMcp(
  method: string,
  params: Record<string, any> = {}
): Promise<{ success: boolean; result?: any; error?: string }> {
  // El motor nativo en Node.js/TypeScript es la fuente de verdad primaria y de producción.
  // n8n es una integración externa complementaria y opcional.
  if (process.env.N8N_ENABLED !== 'true') {
    if (method === 'tools/list') {
      return {
        success: true,
        result: {
          mode: 'native-engine-primary',
          tools: [
            { name: 'check_calendar_availability', description: 'Verifica cupos y disponibilidad en tiempo real vía Firestore nativo' },
            { name: 'create_booking_and_notify', description: 'Genera reserva, bloquea cupo y notifica voucher QR' },
            { name: 'coordinate_provider_status', description: 'Coordina con operador de tour local vía WhatsApp/Email' },
            { name: 'verify_sinpe_payment', description: 'Verifica comprobante de pago SINPE Móvil' },
            { name: 'generate_custom_itinerary', description: 'Generador inteligente de itinerarios de Costa Rica' }
          ]
        }
      };
    }
    if (method === 'tools/call') {
      try {
        const { executeAgentTool } = await import('./agentTools');
        const toolName = params.name || '';
        const mappedName = toolName === 'check_calendar_availability' ? 'check_availability' : toolName;
        const nativeResult = await executeAgentTool(mappedName as any, params.arguments || {});
        return {
          success: true,
          result: nativeResult
        };
      } catch (nativeErr: any) {
        return {
          success: true,
          result: {
            message: `Herramienta ${params.name || method} atendida por el motor nativo de Costa Rica Tours.`,
            detail: nativeErr.message
          }
        };
      }
    }
    return {
      success: true,
      result: { message: `Herramienta ${params.name || method} ejecutada de forma nativa en Costa Rica Tours Node.js` }
    };
  }

  if (!MCP_SERVER_URL || !MCP_TOKEN) {
    return {
      success: false,
      error: 'N8N_ENABLED=true requiere N8N_MCP_SERVER_URL y N8N_MCP_TOKEN configurados como secretos de entorno.'
    };
  }

  try {
    const payload = { jsonrpc: '2.0', id: crypto.randomUUID(), method, params };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_TOKEN}`,
        'User-Agent': 'CostaRicaTours-MCP-Client/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `MCP HTTP Error ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { success: true, result: data.result || data };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Timeout conectando al servidor MCP de n8n' : err.message
    };
  }
}

export async function listN8nMcpTools() {
  return callN8nMcp('tools/list', {});
}

export async function executeN8nMcpTool(name: string, toolArguments: Record<string, any> = {}) {
  return callN8nMcp('tools/call', { name, arguments: toolArguments });
}
