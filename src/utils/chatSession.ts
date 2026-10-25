import { getPersonalItem, getStorageScopeKey, removePersonalItem, setPersonalItem } from './privateStorage';

/**
 * Server-minted chat session capability.
 * The backend only serves conversational memory to callers that present the
 * session id it issued together with its HMAC token (x-chat-session-token).
 */
export interface ChatSessionCredentials {
  sessionId: string;
  sessionToken: string;
}

// Personal: sessionStorage para visitantes, clave con uid para usuarios
// (ver privateStorage). Nunca se comparte entre personas ni visitas anónimas.
const STORAGE_KEY = 'crt_chat_session_v2' as const;

export function readStoredChatSession(): ChatSessionCredentials | null {
  try {
    const raw = getPersonalItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.sessionId === 'string' && typeof parsed?.sessionToken === 'string') {
      return { sessionId: parsed.sessionId, sessionToken: parsed.sessionToken };
    }
  } catch {
    // Corrupt storage: a new session is requested below.
  }
  return null;
}

export function clearStoredChatSession(): void {
  removePersonalItem(STORAGE_KEY);
}

export async function requestChatSession(): Promise<ChatSessionCredentials | null> {
  // Si la identidad cambia mientras se pide la sesión, se descarta: el id
  // emitido para una persona nunca se guarda ni se usa en el ámbito de otra.
  const scopeAtRequest = getStorageScopeKey();
  try {
    const response = await fetch('/api/chat/session', { method: 'POST' });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.sessionId !== 'string' || typeof data?.sessionToken !== 'string') return null;
    if (getStorageScopeKey() !== scopeAtRequest) return null;
    const credentials = { sessionId: data.sessionId, sessionToken: data.sessionToken };
    setPersonalItem(STORAGE_KEY, JSON.stringify(credentials));
    return credentials;
  } catch {
    return null;
  }
}

export function chatSessionHeaders(credentials: ChatSessionCredentials | null): Record<string, string> {
  return credentials ? { 'x-chat-session-token': credentials.sessionToken } : {};
}
