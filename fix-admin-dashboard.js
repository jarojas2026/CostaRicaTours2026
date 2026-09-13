const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

if (!content.includes('Cron Engine')) {
  // if not included, we can try replacing it again just to be safe
}
