const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!content.includes('FormsManagerModal')) {
  content = content.replace(
    "import { LocalBusesModal } from './components/LocalBusesModal';",
    "import { LocalBusesModal } from './components/LocalBusesModal';\nimport { FormsManagerModal } from './components/FormsManagerModal';"
  );
}

// Add state
if (!content.includes('isFormsManagerModalOpen')) {
  content = content.replace(
    '  const [isLocalBusesModalOpen, setIsLocalBusesModalOpen] = useState(false);',
    '  const [isLocalBusesModalOpen, setIsLocalBusesModalOpen] = useState(false);\n  const [isFormsManagerModalOpen, setIsFormsManagerModalOpen] = useState(false);'
  );
}

// Add prop to header
content = content.replace(
  'onOpenLocalBuses={() => setIsLocalBusesModalOpen(true)}',
  'onOpenLocalBuses={() => setIsLocalBusesModalOpen(true)}\n        onOpenFormsManager={() => setIsFormsManagerModalOpen(true)}'
);

// Add modal
const modalToInsert = `      <LocalBusesModal
        isOpen={isLocalBusesModalOpen}
        onClose={() => setIsLocalBusesModalOpen(false)}
        language={language}
        currency={currency}
      />
      
      <FormsManagerModal
        isOpen={isFormsManagerModalOpen}
        onClose={() => setIsFormsManagerModalOpen(false)}
        language={language}
      />`;
      
content = content.replace(
  `<LocalBusesModal
        isOpen={isLocalBusesModalOpen}
        onClose={() => setIsLocalBusesModalOpen(false)}
        language={language}
        currency={currency}
      />`,
  modalToInsert
);

fs.writeFileSync('src/App.tsx', content);
console.log('patched app with forms manager');
