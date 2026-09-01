const fs = require('fs');
let content = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

content = content.replace('{/* Chat Body */}', '<BookingProgressIndicator status={bookingStatus} language={language} />\n            {/* Chat Body */}');

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', content);
