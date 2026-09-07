const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Find the second instance of `{/* Currency Selector */}` and remove it along with the following duplicate Language selector if present.
const firstIdx = code.indexOf('{/* Currency Selector */}');
if (firstIdx !== -1) {
  const secondIdx = code.indexOf('{/* Currency Selector */}', firstIdx + 1);
  if (secondIdx !== -1) {
    // Find where the second language selector ends or where Bookings button starts
    const bookingsIdx = code.indexOf('{/* Bookings Button */', secondIdx);
    if (bookingsIdx !== -1) {
      code = code.substring(0, secondIdx) + code.substring(bookingsIdx);
    }
  }
}

fs.writeFileSync('src/components/Header.tsx', code);
