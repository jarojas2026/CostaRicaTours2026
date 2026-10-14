/**
 * Server-minted chat session capability.
 * The backend only serves conversational memory to callers that present the
 * session id it issued together with its HMAC token (x-chat-session-token).
 */
export interface ChatSessionCredentials {
  sessionId: string;
  sessionToken: string;
}

const STORAGE_KEY = 'crt_chat_session_v2';

export function readStoredChatSession(): ChatSessionCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export async function requestChatSession(): Promise<ChatSessionCredentials | null> {
  try {
    const response = await fetch('/api/chat/session', { method: 'POST' });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.sessionId !== 'string' || typeof data?.sessionToken !== 'string') return null;
    const credentials = { sessionId: data.sessionId, sessionToken: data.sessionToken };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials)); } catch { /* ignore */ }
    return credentials;
  } catch {
    return null;
  }
}

export function chatSessionHeaders(credentials: ChatSessionCredentials | null): Record<string, string> {
  return credentials ? { 'x-chat-session-token': credentials.sessionToken } : {};
}
