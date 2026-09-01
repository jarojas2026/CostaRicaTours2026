const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');
content = content.replace('        </div>          {user ? (', '        </div>\n          {user ? (');
fs.writeFileSync('src/components/Header.tsx', content);
