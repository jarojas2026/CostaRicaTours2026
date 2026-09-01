const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove imports
appContent = appContent.replace("import { AiEcoVisionModal } from './components/AiEcoVisionModal';\n", "");
appContent = appContent.replace("import { GroundedSearchModal } from './components/GroundedSearchModal';\n", "");
appContent = appContent.replace("import { CreativeStudioModal } from './components/CreativeStudioModal';\n", "");
appContent = appContent.replace("import { LiveVoiceModal } from './components/LiveVoiceModal';\n", "");
appContent = appContent.replace("import { FloatingAIHub } from './components/FloatingAIHub';\n", "");
appContent = appContent.replace("import { AIPlatformBanner } from './components/AIPlatformBanner';\n", "");

// 2. Remove states
appContent = appContent.replace("  const [isEcoVisionOpen, setIsEcoVisionOpen] = useState(false);\n", "");
appContent = appContent.replace("  const [isGroundedSearchOpen, setIsGroundedSearchOpen] = useState(false);\n", "");
appContent = appContent.replace("  const [isCreativeStudioOpen, setIsCreativeStudioOpen] = useState(false);\n", "");
appContent = appContent.replace("  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);\n", "");

// 3. Remove header props
appContent = appContent.replace("        onOpenEcoVision={() => setIsEcoVisionOpen(true)}\n", "");
appContent = appContent.replace("        onOpenGroundedSearch={() => setIsGroundedSearchOpen(true)}\n", "");
appContent = appContent.replace("        onOpenCreativeStudio={() => setIsCreativeStudioOpen(true)}\n", "");
appContent = appContent.replace("        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}\n", "");

// 4. Remove banner and hub
appContent = appContent.replace(/      <AIPlatformBanner[\s\S]*?\/>\n/, "");
appContent = appContent.replace(/      <FloatingAIHub[\s\S]*?\/>\n/, "");

// 5. Remove modals
appContent = appContent.replace(/      <AiEcoVisionModal[\s\S]*?\/>\n/, "");
appContent = appContent.replace(/      <GroundedSearchModal[\s\S]*?\/>\n/, "");
appContent = appContent.replace(/      <CreativeStudioModal[\s\S]*?\/>\n/, "");
appContent = appContent.replace(/      <LiveVoiceModal[\s\S]*?\/>\n/, "");

fs.writeFileSync('src/App.tsx', appContent);

// Clean Header.tsx
let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');

headerContent = headerContent.replace("  onOpenEcoVision?: () => void;\n", "");
headerContent = headerContent.replace("  onOpenGroundedSearch?: () => void;\n", "");
headerContent = headerContent.replace("  onOpenCreativeStudio?: () => void;\n", "");
headerContent = headerContent.replace("  onOpenLiveVoice?: () => void;\n", "");

headerContent = headerContent.replace("  onOpenEcoVision,\n", "");
headerContent = headerContent.replace("  onOpenGroundedSearch,\n", "");
headerContent = headerContent.replace("  onOpenCreativeStudio,\n", "");
headerContent = headerContent.replace("  onOpenLiveVoice,\n", "");

fs.writeFileSync('src/components/Header.tsx', headerContent);

// Fix firebase.ts
let fbContent = fs.readFileSync('src/firebase.ts', 'utf8');
fbContent = fbContent.replace(
  "export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);",
  "export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');"
);
fs.writeFileSync('src/firebase.ts', fbContent);

console.log('patched');
