const fs = require('fs');

const docsCode = `
import { api } from './apiManager';
import * as triggers from './n8nTriggers';

// Log loaded
console.log('n8n Triggers Ready:', Object.keys(triggers).length, 'triggers available.');
`;

fs.writeFileSync('src/lib/index.ts', docsCode);
