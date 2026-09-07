const fs = require('fs');
let lines = fs.readFileSync('src/components/Header.tsx', 'utf8').split('\n');

// Find index of line starting with "{/* Currency Selector */}" around 390
let firstCurr = -1;
let secondCurr = -1;
let bookingsIdx = -1;

lines.forEach((line, idx) => {
  if (line.includes('{/* Currency Selector */}')) {
    if (firstCurr === -1) firstCurr = idx;
    else if (secondCurr === -1) secondCurr = idx;
  }
  if (line.includes('{/* My Bookings Button */}')) {
    bookingsIdx = idx;
  }
});

console.log({ firstCurr, secondCurr, bookingsIdx });

if (secondCurr !== -1 && bookingsIdx !== -1) {
  // Remove from secondCurr up to bookingsIdx - 1
  lines.splice(secondCurr, bookingsIdx - secondCurr);
  fs.writeFileSync('src/components/Header.tsx', lines.join('\n'));
  console.log('Successfully removed duplicated selectors!');
} else {
  console.log('Indices not found correctly');
}
