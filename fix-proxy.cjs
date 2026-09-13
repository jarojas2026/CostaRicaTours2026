const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "  '/webhook/booster-reseñas-incentivos'",
  "  '/webhook/booster-reseñas-incentivos',\n  '/webhook/contingency',\n  '/webhook/supervisor'"
);
fs.writeFileSync('server.ts', content);
