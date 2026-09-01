const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
content = content.replace(/alert\("Análisis del Supervisor:[^"]*/, 'alert("Análisis del Supervisor:\\n\\n"');
fs.writeFileSync('src/components/AdminDashboard.tsx', content);
