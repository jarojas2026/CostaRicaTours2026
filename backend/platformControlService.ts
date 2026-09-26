export async function getPlatformControls() {
  return {
    maintenanceMode: false,
    allowBookings: true,
    defaultCommissionRate: 0.20,
    supportedCurrencies: ['USD', 'CRC', 'EUR', 'GBP', 'CAD'],
    max_agent_tool_rounds: 3,
    values: {
      max_agent_tool_rounds: 3
    },
    updatedAt: new Date().toISOString()
  };
}

export async function updatePlatformControls(controls: any) {
  return {
    success: true,
    controls: {
      maintenanceMode: false,
      allowBookings: true,
      ...controls,
      updatedAt: new Date().toISOString()
    }
  };
}
