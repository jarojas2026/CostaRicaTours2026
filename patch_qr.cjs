const fs = require('fs');

let content = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// Add QRCode import
content = content.replace("import { Scanner }", "import QRCode from 'qrcode';\nimport { Scanner }");
content = content.replace("VolumeX } from 'lucide-react'", "VolumeX, Share2, Download } from 'lucide-react'");

// Add state
content = content.replace(
  "const [recentScans, setRecentScans] = useState<string[]>([]);",
  "const [recentScans, setRecentScans] = useState<string[]>([]);\n  const [isGeneratingQR, setIsGeneratingQR] = useState(false);\n  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);"
);

// Add QR generation effect
content = content.replace(
  "const { isMuted, setIsMuted } = useNatureSounds(isOpen);",
  `const { isMuted, setIsMuted } = useNatureSounds(isOpen);

  useEffect(() => {
    if (isGeneratingQR) {
      QRCode.toDataURL(window.location.href, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => {
        setGeneratedQRUrl(url);
      })
      .catch(err => {
        console.error(err);
      });
    } else {
      setGeneratedQRUrl(null);
    }
  }, [isGeneratingQR, window.location.href]);`
);

// Add option
content = content.replace(
  "        text: language === 'es' ? 'Escanear Código de Tour' : 'Scan Tour Code',\n        msg: ''\n      }",
  `        text: language === 'es' ? 'Escanear Código de Tour' : 'Scan Tour Code',
        msg: ''
      },
      {
        id: 'generate-qr',
        icon: <Share2 className="w-5 h-5 text-orange-500" />,
        text: language === 'es' ? 'Compartir (QR)' : 'Share via QR',
        msg: ''
      }`
);

// Handle option
content = content.replace(
  "      setIsScanning(true);\n      setIsOpen(false);\n    } else {",
  `      setIsScanning(true);
      setIsOpen(false);
    } else if (opt.id === 'generate-qr') {
      setIsGeneratingQR(true);
      setIsOpen(false);
    } else {`
);

// Add UI for generating QR. I will insert it after the isScanning AnimatePresence block.
// I need to find `</AnimatePresence>\n      <div className="flex flex-col items-center gap-3">`

const qrModal = `
      <AnimatePresence>
        {isGeneratingQR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-neutral-950 border border-orange-500/30 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(249,115,22,0.2)] relative">
              <div className="p-5 bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-3">
                  <Share2 className="w-6 h-6 text-orange-100" />
                  <h3 className="font-black text-lg uppercase tracking-wide">
                    {language === 'es' ? 'Compartir Página' : 'Share Page'}
                  </h3>
                </div>
                <button onClick={() => setIsGeneratingQR(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 relative bg-neutral-900 flex flex-col items-center">
                <p className="text-neutral-300 text-sm mb-6 text-center">
                  {language === 'es' ? 'Escanea este código para abrir la página actual en otro dispositivo.' : 'Scan this code to open the current page on another device.'}
                </p>
                
                {generatedQRUrl ? (
                  <div className="bg-white p-4 rounded-3xl shadow-xl">
                    <img src={generatedQRUrl} alt="QR Code" className="w-64 h-64 object-contain" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-white/5 animate-pulse rounded-3xl flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-orange-500/50" />
                  </div>
                )}
                
                {generatedQRUrl && (
                  <a
                    href={generatedQRUrl}
                    download="pura-vida-share.png"
                    className="mt-8 w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {language === 'es' ? 'Descargar QR' : 'Download QR'}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
`;

content = content.replace("        )}\n      </AnimatePresence>\n      <div className=\"flex flex-col items-center gap-3\">", "        )}\n      </AnimatePresence>\n" + qrModal + "\n      <div className=\"flex flex-col items-center gap-3\">");

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', content);
console.log('patched floating whatsapp');
