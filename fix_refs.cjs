const fs = require('fs');
let c = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
c = c.replace(/const prevIsOpenRef = useRef/g, 'const prevIsOpenRef = React.useRef');
c = c.replace(/const prevChatLengthRef = useRef/g, 'const prevChatLengthRef = React.useRef');
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', c);
