import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_faqs = """
PREGUNTAS FRECUENTES DEL TURISTA (KNOW BEFORE YOU GO) - TIPS VITALES:
- Seguridad (Is Costa Rica safe?): Costa Rica es el país más seguro de Centroamérica. Solo aplica sentido común: no dejes objetos de valor solos en el carro ni en la playa, y usa taxis oficiales o Uber.
- Transporte y Uber: Uber es completamente legal, seguro y económico en el Gran Área Metropolitana (San José) y algunas playas populares (Jaco, Tamarindo). Para distancias largas, recomendamos alquilar un 4x4 o usar Shuttles privados compartidos.
- Dinero y Moneda (Money & Currency): La moneda oficial es el Colón (CRC), pero el USD ($) es aceptado en casi todo lado. Trata de llevar billetes de dólares pequeños (menos de $50). También se acepta tarjeta de crédito en el 95% de los comercios (Visa y Mastercard).
- Tarjetas SIM (SIM Card): Puedes comprar un chip Kolbi, Claro o Liberty al llegar al aeropuerto o en pulperías. Cuestan como $5-$10 USD. También puedes comprar una eSIM por internet antes de viajar si tu celular lo soporta.
- Seguro de Viaje (Travel Insurance): Recomendamos viajar con seguro médico, porque el sistema de salud privado en Costa Rica es de altísima calidad pero puede ser costoso.
- Mejor época para visitar (Best time to visit): La época seca es de Diciembre a Abril. La época verde (lluviosa pero más barata y menos concurrida) es de Mayo a Noviembre.
- Viajar con niños (Costa Rica with kids): Es un país extremadamente amigable para familias. Playas tranquilas como Manuel Antonio y Samara, y caminatas en puentes colgantes son perfectas.
"""

content = content.replace("POLÍTICAS DE LA EMPRESA & TROUBLESHOOTING:", new_faqs + "\nPOLÍTICAS DE LA EMPRESA & TROUBLESHOOTING:")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
