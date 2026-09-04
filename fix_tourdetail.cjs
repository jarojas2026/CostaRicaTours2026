const fs = require('fs');

let file = fs.readFileSync('src/components/TourDetailModal.tsx', 'utf8');

// I'll extract from line 442 to 501 and replace it with the correct block.
const lines = file.split('\n');

const newLines = `
      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             tourId: tour.id,
             tourName: tourTitle,
             totalUSD,
             customerEmail: finalEmail,
             date: selectedDate || tomorrowStr,
             passengers: (adults || 1) + (children || 0)
           })
        });
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
           window.location.href = stripeData.url;
           return;
        } else {
           throw new Error(stripeData.error || 'Error al conectar con Stripe');
        }
      } else if (paymentMethod === 'paypal') {
        const paypalRes = await fetch('/api/paypal/create-order', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             totalUSD,
             tourName: tourTitle
           })
        });
        const paypalData = await paypalRes.json();
        if (paypalData.url) {
           bookingPayload.paypalOrderId = paypalData.id;
           await fetch('/api/bookings', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(bookingPayload)
           });
           window.location.href = paypalData.url;
           return;
        } else {
           throw new Error(paypalData.error || 'Error al conectar con PayPal');
        }
      }
`;

lines.splice(441, 60, newLines);

fs.writeFileSync('src/components/TourDetailModal.tsx', lines.join('\n'));
console.log("Fixed TourDetailModal.");
