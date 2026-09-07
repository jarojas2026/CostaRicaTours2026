const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
// Fix body class
html = html.replace(/<body class="[^"]*">/, '<body class="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">');
fs.writeFileSync('index.html', html);
