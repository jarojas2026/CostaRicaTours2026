import re

def process_file(filename, subs):
    with open(filename, 'r') as f:
        text = f.read()
    for old, new in subs:
        text = text.replace(old, new)
    with open(filename, 'w') as f:
        f.write(text)

process_file('src/components/HeroSection.tsx', [
    ('Guía bilingüe ICT', 'Guía bilingüe'),
    ('Bilingual ICT guide', 'Bilingual guide'),
    ('certificados por el ICT', 'locales'),
    ('ICT certified naturalists', 'local naturalists')
])

process_file('src/components/LegalModal.tsx', [
    ('ESCNNA e ICT', 'Normativa ESCNNA'),
    ('ESCNNA & ICT', 'ESCNNA Rules'),
    ('<li><strong>Registro ICT:</strong> #1042</li>', ''),
    ('Instituto Costarricense de Turismo (ICT)', 'las autoridades locales'),
    ('legislación fiscal y turística costarricense', 'legislación costarricense'),
    ('Declaración ESCNNA y Normativa ICT', 'Declaración ESCNNA'),
    ('<p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Registro ICT</p>', ''),
])

process_file('src/components/CustomFunnelModal.tsx', [
    ('Pass Parques ICT', 'Pass Parques SINAC'),
    ('Guía Certificado ICT', 'Guía Turístico'),
    ('ICT Park Passes', 'SINAC Park Passes'),
    ('Reservaciones Parques SINAC / ICT', 'Reservaciones Parques SINAC'),
    ('Guía Turístico Certificado ICT', 'Guía Turístico Certificado')
])

process_file('src/components/NationalTransportSection.tsx', [
    ('autorizado por el ICT', 'autorizado')
])

process_file('src/components/LocalBusesModal.tsx', [
    ('Guía Nacional CTP / ICT', 'Guía Oficial'),
    ('Official CTP National Guide', 'Official National Guide')
])

process_file('src/utils/i18n.ts', [
    ('Agencia Certificada ICT Costa Rica', 'Agencia de Viajes Costa Rica'),
    ('ICT Certified Costa Rica Agency', 'Costa Rica Travel Agency'),
    ('ICT Zertifizierte Agentur Costa Rica', 'Reisebüro Costa Rica'),
    ('Agence Certifiée ICT Costa Rica', 'Agence de voyage Costa Rica'),
    ('哥斯达黎加 ICT 认证旅行社', '哥斯达黎加旅行社'),
    ('コスタリカICT認定旅行会社', 'コスタリカ旅行会社'),
    ('Certificados por el ICT.', 'Experiencias únicas.'),
    ('ICT Certified.', 'Unique experiences.'),
    ('Pura Vida Tours Costa Rica • Licencia ICT #1042', 'Pura Vida Tours Costa Rica'),
    ('Pura Vida Tours Costa Rica • ICT License #1042', 'Pura Vida Tours Costa Rica'),
    ('Pura Vida Tours Costa Rica • ICT Lizenz #1042', 'Pura Vida Tours Costa Rica'),
    ('Pura Vida Tours Costa Rica • Licence ICT #1042', 'Pura Vida Tours Costa Rica'),
    ('哥斯达黎加纯享旅游 • ICT 许可证 #1042', '哥斯达黎加纯享旅游'),
    ('プラビダ・ツアーズ・コスタリカ • ICTライセンス #1042', 'プラビダ・ツアーズ・コスタリカ'),
    ('Guías ICT Locales', 'Guías Locales'),
    ('Local ICT Guides', 'Local Guides'),
    ('Lokale ICT-Führer', 'Lokale Führer'),
    ('Guides ICT Locaux', 'Guides Locaux'),
    ('当地 ICT 导游', '当地导游'),
    ('地元ICTガイド', '地元ガイド')
])

