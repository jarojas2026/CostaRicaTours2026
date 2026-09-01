const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// The file currently has a missing opening tag. Wait, let's just see where `{user ? (` is.
const lines = content.split('\n');
const userLineIdx = lines.findIndex(l => l.includes('{user ? ('));
console.log('userLineIdx:', userLineIdx);

// Look at the lines around it.
for (let i = userLineIdx - 5; i <= userLineIdx + 5; i++) {
  console.log(i + ': ' + lines[i]);
}

