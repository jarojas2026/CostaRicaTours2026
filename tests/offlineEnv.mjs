// Contract tests exercise the unavailable-storage path or inject a fake transaction.
// They must never discover a developer's ADC and write to a real database.
process.env.NODE_ENV = 'test';
process.env.FIRESTORE_CONTRACT_TEST_OFFLINE = 'true';
