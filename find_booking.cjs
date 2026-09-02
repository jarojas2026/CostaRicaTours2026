const fs = require('fs');
const glob = require('glob');

glob('src/components/**/*.tsx', (err, files) => {
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('paymentMethod')) {
      console.log(file);
    }
  });
});
