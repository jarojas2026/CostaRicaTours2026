const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add to props interface if not added already
if (!content.includes('onOpenFormsManager?: () => void;')) {
  content = content.replace(
    'onOpenLocalBuses?: () => void;',
    'onOpenLocalBuses?: () => void;\n  onOpenFormsManager?: () => void;'
  );
}

// Add to destructuring
content = content.replace(
  '  onOpenLocalBuses,',
  '  onOpenLocalBuses,\n  onOpenFormsManager,'
);

// Add the forms button
// Locate the user block
const userBlock = `{user ? (
            <div className="flex items-center gap-2">
              <img src={user.photoURL || \`https://ui-avatars.com/api/?name=\${user.displayName}\`} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/10" />`;
              
const newUserBlock = `{user ? (
            <div className="flex items-center gap-2">
              {onOpenFormsManager && (
                <button
                  onClick={onOpenFormsManager}
                  className="hidden md:flex items-center gap-1.5 text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-purple-400 px-2 py-1.5 rounded-full border border-purple-500/30 transition-colors"
                  title="Google Forms Manager"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{language === 'es' ? 'Formularios' : 'Forms'}</span>
                </button>
              )}
              <img src={user.photoURL || \`https://ui-avatars.com/api/?name=\${user.displayName}\`} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/10" />`;

content = content.replace(userBlock, newUserBlock);
fs.writeFileSync('src/components/Header.tsx', content);
console.log('patched header with forms button');
