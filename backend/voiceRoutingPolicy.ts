export function voiceRoutingPolicy(env: Record<string, string | undefined> = process.env) {
  const numbers = [...new Set((env.VOICE_HUMAN_NUMBERS || env.VOICE_HUMAN_NUMBER || '')
    .split(',').map(value => value.trim()).filter(value => /^\+[1-9]\d{7,14}$/.test(value)))].slice(0, 8);
  let publicBaseUrl = '';
  try {
    const url = new URL(env.PUBLIC_BASE_URL || env.APP_URL || '');
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) publicBaseUrl = url.origin;
  } catch {}
  const missing = [
    ...(env.VOICE_AGENT_DESK_ENABLED === 'true' ? [] : ['VOICE_AGENT_DESK_ENABLED']),
    ...(env.VOICE_PROVIDER_AUTH_TOKEN ? [] : ['VOICE_PROVIDER_AUTH_TOKEN']),
    ...(publicBaseUrl ? [] : ['PUBLIC_BASE_URL (HTTPS origin)']),
  ];
  return { numbers, publicBaseUrl, ready: missing.length === 0, missing,
    primaryHandler: 'Costa Rica Tours Agent Desk IA',
    humanTransferLabel: env.VOICE_HUMAN_LABEL || 'Responsable humano por asignar' };
}

export function requestsHuman(speech = '', digits = '') {
  return digits.trim() === '0' || /\b(humano|humana|persona|operador|operadora|asesor|asesora|human|person|operator|representative)\b/i.test(speech);
}
