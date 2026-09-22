export async function processProviderInboxOnce() {
  return {
    success: true,
    processedEmails: 0,
    confirmedBookings: 0,
    timestamp: new Date().toISOString()
  };
}
