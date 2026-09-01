const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `  totalUSD: number;
  totalCRC: number;
  dynamicFields?: {
    weightKg?: number;
    dietaryRestrictions?: string;
    specialNeeds?: string;
  };
  softHoldExpiresAt?: string;`;

content = content.replace(/  totalUSD: number;\s*totalCRC: number;/, newTypes);
fs.writeFileSync('src/types.ts', content);
