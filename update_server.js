const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\("\/api\/bookings", async \(req, res\) => \{[\s\S]*?\n\}\);\s*app\.get\("\/api\/bookings"/;
const match = server.match(regex);
if (match) {
  console.log("Found bookings endpoint!");
  fs.writeFileSync('original_bookings.txt', match[0]);
} else {
  console.log("Could not find bookings endpoint.");
}

