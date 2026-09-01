const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// I need to remove one closing </div> right before `{user ? (`
let lines = content.split('\n');
let userLineIdx = lines.findIndex(l => l.includes('{user ? ('));

// delete line userLineIdx - 1 if it is </div>
if (lines[userLineIdx - 1].trim() === '</div>') {
  lines.splice(userLineIdx - 1, 1);
  console.log('Removed extra </div> before {user ? (');
}

// Write back
fs.writeFileSync('src/components/Header.tsx', lines.join('\n'));
