const fs = require('fs');
let code = fs.readFileSync('src/components/AIAssistant.tsx', 'utf8');

// The replace logic broke the onChange handler
code = code.replace(/onChange=\{\(e\) = spellCheck="false" autoComplete="off" autoCorrect="off"> setInputMessage\(e\.target\.value\)\}/g, 'onChange={(e) => setInputMessage(e.target.value)} spellCheck="false" autoComplete="off" autoCorrect="off"');
code = code.replace(/<input\s+type="text"\s+value=\{inputMessage\}\s+onChange=\{\(e\) => setInputMessage\(e\.target\.value\)\}\s+spellCheck="false"\s+autoComplete="off"\s+autoCorrect="off"/g, 
  '<input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} spellCheck="false" autoComplete="off" autoCorrect="off"');

fs.writeFileSync('src/components/AIAssistant.tsx', code);
