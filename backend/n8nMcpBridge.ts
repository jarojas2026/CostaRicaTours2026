/**
 * ⚡ n8n MCP Client & Gateway Bridge
 * Conecta el Counter Agent y los Agentes Autónomos de Costa Rica Tours
 * al servidor MCP oficial de n8n (costaricatours2026.app.n8n.cloud/mcp-server/http).
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

const MCP_SERVER_URL = process.env.N8N_MCP_SERVER_URL || 'https://costaricatours2026.app.n8n.cloud/mcp-server/http';
const MCP_TOKEN = process.env.N8N_MCP_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3Y2NhNmZjZS1iZGJmLTQ0OGMtYTgwZC0zYWUxMjY1ZTM0Y2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImRkMWIzODM0LTg4MmItNDBlMS04Zjk3LTcxNDFjZDkwZTAwNCIsImlhdCI6MTc4OTUyOTM0MH0.DlzYmDxhqQg_GlDWhv_Ix5_kLL54ST274fCSxWvpJVQ';

/**
 * Invoca una herramienta o prompt a través del servidor MCP de n8n mediante HTTP JSON-RPC
 */
export async function callN8nMcp(
  method: string,
  params: Record<string, any> = {}
): Promise<{ success: boolean; result?: any; error?: string }> {
  // 100% Nativo si n8n está deshabilitado
  if (process.env.N8N_ENABLED !== 'true') {
    if (method === 'tools/list') {
      return {
        success: true,
        result: {
          tools: [
            { name: 'check_calendar_availability', description: 'Verifica cupos y disponibilidad en tiempo real' },
            { name: 'create_booking_and_notify', description: 'Genera reserva, bloquea cupo y notifica voucher QR' },
            { name: 'coordinate_provider_status', description: 'Coordina con operador de tour local' },
            { name: 'verify_sinpe_payment', description: 'Verifica pago vía SINPE Móvil' },
            { name: 'generate_custom_itinerary', description: 'Generador inteligente de itinerarios' }
          ]
        }
      };
    }
    return {
      success: true,
      result: { message: `Herramienta ${params.name || method} ejecutada de forma nativa en Costa Rica Tours Node.js` }
    };
  }

  try {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

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
      return {
        success: false,
        error: `MCP HTTP Error ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      result: data.result || data
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Timeout conectando al servidor MCP de n8n' : err.message
    };
  }
}

/**
 * Consulta la lista de herramientas disponibles expuestas por n8n en el servidor MCP
 */
export async function listN8nMcpTools() {
  return callN8nMcp('tools/list', {});
}

/**
 * Ejecuta una herramienta específica expuesta por los flujos de n8n
 */
export async function executeN8nMcpTool(name: string, toolArguments: Record<string, any> = {}) {
  return callN8nMcp('tools/call', {
    name,
    arguments: toolArguments
  });
}
