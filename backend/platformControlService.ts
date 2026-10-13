import { getGlobalAgentControl } from './agentGovernanceService';

export async function getPlatformControls() {
  return {
    maintenanceMode: false,
    allowBookings: true,
    defaultCommissionRate: 0.20,
    supportedCurrencies: ['USD', 'CRC', 'EUR', 'GBP', 'CAD'],
    max_agent_tool_rounds: 3,
    values: {
      max_agent_tool_rounds: 3,
    },
    agentGovernance: await getGlobalAgentControl(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updatePlatformControls(controls: Record<string, unknown>) {
  // Agent shutdown is owner-only and must go through agentGovernanceService.
  // Never let the legacy generic settings endpoint bypass that authority.
  const {
    agentsDisabled: _agentsDisabled,
    agentGovernance: _agentGovernance,
    ...safeControls
  } = controls || {};

  return {
    success: true,
    controls: {
      maintenanceMode: false,
      allowBookings: true,
      ...safeControls,
      agentGovernance: await getGlobalAgentControl(),
      updatedAt: new Date().toISOString(),
    },
  };
}
