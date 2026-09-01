const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('const [isFormsManagerModalOpen')) {
  content = content.replace(
    '  const [isLocalBusesOpen, setIsLocalBusesOpen] = useState(false);',
    '  const [isLocalBusesOpen, setIsLocalBusesOpen] = useState(false);\n  const [isFormsManagerModalOpen, setIsFormsManagerModalOpen] = useState(false);'
  );
}

content = content.replace(
  'onOpenLocalBuses={() => setIsLocalBusesOpen(true)}',
  'onOpenLocalBuses={() => setIsLocalBusesOpen(true)}\n        onOpenFormsManager={() => setIsFormsManagerModalOpen(true)}'
);

if (!content.includes('<FormsManagerModal')) {
  const modalToInsert = `      <LocalBusesModal
        isOpen={isLocalBusesOpen}
        onClose={() => setIsLocalBusesOpen(false)}
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
        isOpen={isLocalBusesOpen}
        onClose={() => setIsLocalBusesOpen(false)}
        language={language}
        currency={currency}
      />`,
    modalToInsert
  );
}

fs.writeFileSync('src/App.tsx', content);
