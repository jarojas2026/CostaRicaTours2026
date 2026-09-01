const fs = require('fs');
let content = fs.readFileSync('src/firebase.ts', 'utf8');

// replace Google Tasks scopes comment and line with Google Forms and Drive scopes
content = content.replace(
  "// Add Google Tasks scopes\ngoogleProvider.addScope('https://www.googleapis.com/auth/tasks');",
  `// Add Google Forms & Drive scopes
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleProvider.addScope('https://www.googleapis.com/auth/forms.body.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');`
);

fs.writeFileSync('src/firebase.ts', content);
console.log('patched firebase.ts');
