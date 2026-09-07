const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Find the first Currency selector block and second Currency selector block.
// We want to keep exactly one Currency selector and one Language selector before Bookings button.

const firstCurr = code.indexOf('{/* Currency Selector */}');
if (firstCurr !== -1) {
  const secondCurr = code.indexOf('{/* Currency Selector */}', firstCurr + 1);
  if (secondCurr !== -1) {
    // Find where the Bookings button or mobile menu button starts after secondCurr
    const bookingsIdx = code.indexOf('{/* Bookings Button */', secondCurr);
    if (bookingsIdx !== -1) {
      code = code.substring(0, secondCurr) + code.substring(bookingsIdx);
    }
  }
}

fs.writeFileSync('src/components/Header.tsx', code);
