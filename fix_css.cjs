const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// Remove the injected @theme block we added
css = css.replace(/@theme \{[\s\S]*?--color-white: #ffffff; \/\* keep real white \*\//, "@theme {");
css = css.replace(/--app-stone-950: #FFFFFF;/g, "--app-stone-950: #FFFFFF;");
css = css.replace(/--app-stone-900: #F8FAFC;/g, "--app-stone-900: #F8FAFC;");

// Reset color property to a dark text color
css = css.replace(/color: #1E293B;/g, "color: #1E293B;");

fs.writeFileSync('src/index.css', css);
console.log("CSS restored!");
