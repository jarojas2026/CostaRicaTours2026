const activeControllers = new Map<string, Map<string, AbortController>>();

function clean(value: string, field: string): string {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field} es obligatorio.`);
  return text;
}

export function registerAgentAbortController(input: {
  agentId: string;
  runId: string;
  controller: AbortController;
}): () => void {
  const agentId = clean(input.agentId, 'agentId');
  const runId = clean(input.runId, 'runId');
  const byRun = activeControllers.get(agentId) || new Map<string, AbortController>();
  byRun.set(runId, input.controller);
  activeControllers.set(agentId, byRun);

  return () => {
    const current = activeControllers.get(agentId);
    current?.delete(runId);
    if (current && current.size === 0) activeControllers.delete(agentId);
  };
}

export function abortAgentExecutions(agentId: string, reason = 'agent_governance_revoked'): number {
  const id = String(agentId || '').trim();
  if (!id) return 0;
  const current = activeControllers.get(id);
  if (!current) return 0;
  let aborted = 0;
  for (const controller of current.values()) {
    if (!controller.signal.aborted) {
      controller.abort(reason);
      aborted += 1;
    }
  }
  activeControllers.delete(id);
  return aborted;
}

export function abortAllAgentExecutions(reason = 'global_agent_shutdown'): number {
  let aborted = 0;
  for (const agentId of [...activeControllers.keys()]) {
    aborted += abortAgentExecutions(agentId, reason);
  }
  return aborted;
}

export function activeAgentExecutionCount(agentId?: string): number {
  if (agentId) return activeControllers.get(String(agentId).trim())?.size || 0;
  let total = 0;
  for (const runs of activeControllers.values()) total += runs.size;
  return total;
}
