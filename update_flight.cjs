const fs = require('fs');

let file = fs.readFileSync('src/components/FlightBookingModal.tsx', 'utf8');

const regex = /const res = await fetch\('\/api\/bookings', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(newBooking\),\s*\}\);/m;

const replacement = `
      if (paymentMethod === 'credit_card') {
        const stripeRes = await fetch('/api/stripe/create-checkout-session', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             tourId: 'flight-' + flight.flightNumber,
             tourName: 'Vuelo Privado ' + flight.flightNumber + ' - ' + flight.airline,
             totalUSD: flight.priceUSD * (adults + children),
             customerEmail: email,
             date: flight.departureDate,
             passengers: adults + children
           })
        });
        const stripeData = await stripeRes.json();
        if (stripeData.url) {
           window.location.href = stripeData.url;
           return;
        } else {
           throw new Error(stripeData.error || 'Error al conectar con Stripe');
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });`;

if (file.match(regex)) {
  file = file.replace(regex, replacement);
  fs.writeFileSync('src/components/FlightBookingModal.tsx', file);
  console.log("Updated FlightBookingModal with Stripe.");
} else {
  console.log("Could not find regex target in FlightBookingModal.");
}
