const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
if (!code.includes('export default FloatingWhatsApp')) {
    code += '\n\nexport default FloatingWhatsApp;\n';
    fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
    console.log("Added export default");
} else {
    console.log("Export default already exists");
}
