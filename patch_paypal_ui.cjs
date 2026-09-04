const fs = require('fs');
let file = fs.readFileSync('src/components/TourDetailModal.tsx', 'utf8');

const regex = /if \(paymentMethod === 'credit_card'\) \{[\s\S]*?\n\s*\}/m;

const replacement = `if (paymentMethod === 'credit_card') {
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
           // We must save the paypalOrderId somewhere or just redirect, 
           // and upon return it verifies. 
           // Wait! To verify later, we need the booking info! 
           // Usually PayPal redirects back and we create the booking THEN, 
           // OR we create the booking as pending now, and update it later.
           
           bookingPayload.paypalOrderId = paypalData.id;
           // We send the booking to backend to save it as pending
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
      }`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/components/TourDetailModal.tsx', file);
console.log("Updated TourDetailModal with PayPal.");
