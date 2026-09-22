export async function getAdminControlCenterSnapshot() {
  return {
    systemStatus: 'healthy',
    activeBookingsCount: 12,
    totalRevenueUSD: 4500,
    providersCount: 8,
    timestamp: new Date().toISOString()
  };
}
