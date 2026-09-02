const fs = require('fs');
let c = fs.readFileSync('src/hooks/useNatureSounds.ts', 'utf8');
c = c.replace(/  \};\n  \}, \[isMuted\]\);/, '  }, [isMuted]);');
fs.writeFileSync('src/hooks/useNatureSounds.ts', c);
