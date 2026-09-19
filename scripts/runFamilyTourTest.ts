import { createBooking } from '../backend/bookingService';
import { executeCustomerProformaConfirmation } from '../backend/nativeWorkflows';

const TEST_EMAIL = 'test@example.com';

async function runFamilyTourTest(): Promise<void> {
  console.log('Starting sanitized family booking integration test...');

  const bookingPayload = {
    bookingId: `CR-TEST-${Date.now()}`,
    idempotencyKey: `family-test-${Date.now()}`,
    tourId: 'costa-rica-essential-15days-family',
    tourName: 'Costa Rica Family Test Tour',
    date: '2026-10-15',
    time: '09:00 AM',
    adults: 2,
    children: 1,
    pickupHotel: 'Test Pickup Location',
    specialRequests: 'Sanitized integration-test payload.',
    totalUSD: 2450,
    currency: 'USD',
    paymentMethod: 'credit_card',
    customerName: 'Test Customer',
    customerEmail: TEST_EMAIL,
    customerPhone: '',
  };

  try {
    const result = await createBooking(bookingPayload);
    const bookingId = result.booking?.bookingId ?? bookingPayload.bookingId;

    const proformaResult = await executeCustomerProformaConfirmation({
      bookingId,
      customerName: bookingPayload.customerName,
      customerEmail: TEST_EMAIL,
      customerPhone: bookingPayload.customerPhone,
      adults: bookingPayload.adults,
      children: bookingPayload.children,
      tourName: bookingPayload.tourName,
      startDate: bookingPayload.date,
      time: bookingPayload.time,
      totalUSD: bookingPayload.totalUSD,
      specialRequests: bookingPayload.specialRequests,
    });

    console.log(JSON.stringify({
      success: true,
      bookingId,
      pdfGenerated: proformaResult.pdfGenerated,
      emailSent: proformaResult.emailSent,
    }));
  } catch (error) {
    console.error('Family booking integration test failed:', error);
    process.exitCode = 1;
  }
}

runFamilyTourTest().catch((error) => {
  console.error('Family booking integration test failed:', error);
  process.exitCode = 1;
});
