import re
import glob

# src/components/Header.tsx
with open('src/components/Header.tsx', 'r') as f:
    text = f.read()
text = re.sub(r'<span className="hidden sm:inline">Licencia ICT #1042</span>', '', text)
text = re.sub(r'<span className="sm:hidden">ICT #1042</span>', '', text)
text = re.sub(r'COSTA RICA • ICT LIC #1042', 'COSTA RICA', text)
with open('src/components/Header.tsx', 'w') as f:
    f.write(text)

# src/components/Footer.tsx
with open('src/components/Footer.tsx', 'r') as f:
    text = f.read()
text = re.sub(r'Agencia Autorizada ICT #1042', 'Agencia de Viajes', text)
text = re.sub(r'<a href="https://www.ict.go.cr" target="_blank" rel="noopener noreferrer" className="hover:underline text-amber-300 font-extrabold">ICT License #1042</a>', '', text)
with open('src/components/Footer.tsx', 'w') as f:
    f.write(text)

# src/components/LegalModal.tsx
with open('src/components/LegalModal.tsx', 'r') as f:
    text = f.read()
text = re.sub(r'el <strong>Instituto Costarricense de Turismo \(ICT\)</strong> y ', '', text)
text = re.sub(r', el Ministerio Público y el ICT\.', ' y el Ministerio Público.', text)
text = re.sub(r'<div className="mb-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100">.*?Registro ICT.*?</div>', '', text, flags=re.DOTALL)
with open('src/components/LegalModal.tsx', 'w') as f:
    f.write(text)

# src/components/EcoImpactCounter.tsx
with open('src/components/EcoImpactCounter.tsx', 'r') as f:
    text = f.read()
text = re.sub(r' certificados por el ICT', '', text)
text = re.sub(r' ICT-certified', '', text)
text = re.sub(r'<span className="text-xl font-black text-white block">ICT #1042</span>', '', text)
with open('src/components/EcoImpactCounter.tsx', 'w') as f:
    f.write(text)

# src/components/TravelerToolkit.tsx
with open('src/components/TravelerToolkit.tsx', 'r') as f:
    text = f.read()
text = text.replace("Requisitos & ICT", "Requisitos de Entrada")
text = text.replace("Requirements & ICT", "Entry Requirements")
text = text.replace("TAB 3: Entry Requirements & ICT Certification", "TAB 3: Entry Requirements")
text = text.replace("Garantía de Agencia Certificada ICT", "Agencia de Viajes en Costa Rica")
text = text.replace("Pura Vida Tours opera bajo licencias autorizadas del Instituto Costarricense de Turismo (ICT). Garantizamos seguros de póliza comercial en cada unidad de transporte y guías registrados.", "Garantizamos seguros de póliza comercial en cada unidad de transporte y guías locales profesionales.")
with open('src/components/TravelerToolkit.tsx', 'w') as f:
    f.write(text)

# src/data/toursData.ts
with open('src/data/toursData.ts', 'r') as f:
    text = f.read()
text = re.sub(r'\s*ICT\s*|(?<=por el )ICT\s*', '', text) # This might be risky, let's just do a simpler replace.
with open('src/data/toursData.ts', 'w') as f:
    f.write(text)

