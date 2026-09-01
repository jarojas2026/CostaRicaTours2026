const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add to props
content = content.replace(
  'onOpenLocalBuses?: () => void;',
  'onOpenLocalBuses?: () => void;\n  onOpenFormsManager?: () => void;'
);

// Add to button list
// Let's find a good spot to add the button. Maybe next to the user sign in/out buttons, if the user is authenticated.
// There is a `user ? (` block in the code. Let's find it.
