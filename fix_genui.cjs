const fs = require('fs');
let content = fs.readFileSync('src/components/AIAssistant.tsx', 'utf8');

// Replace formatCurrency(foundTour.priceUSD, currency) with formatCurrency(foundTour.priceUSD, 'USD')
content = content.replace(/formatCurrency\(foundTour\.priceUSD, currency\)/g, "formatCurrency(foundTour.priceUSD, 'USD')");

// Also delete map_test.tsx
if (fs.existsSync('map_test.tsx')) {
  fs.unlinkSync('map_test.tsx');
}

fs.writeFileSync('src/components/AIAssistant.tsx', content);
