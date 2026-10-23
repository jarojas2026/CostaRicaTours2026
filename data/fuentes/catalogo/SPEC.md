# Expansión del catálogo — especificación de investigación

Output: one CSV per subagent at /workspace/projects/1648c208-1300-4806-9106-800049b4a1a7/catalogo/<archivo>.csv (UTF-8, header row, quote fields with commas).

Columns (exact order):
id_slug,titulo_es,titulo_en,categoria,region,lugar,lat,lng,operador,url_fuente,precio_usd_adulto,precio_usd_nino,duracion_horas,dificultad,edad_minima,incluye,descripcion_es,descripcion_en,notas

- categoria: one of volcanoes, wildlife, canopy, beaches, rafting, culture, multiday, combos, adventure, nature, hiking, waterfalls, rural, gastronomy, surf, snorkeling, diving, whale_watching, kayak, fishing, family, services
- region: one of arenal, monteverde, manuel_antonio, guanacaste, tortuguero, pacuare, san_jose, caribe_sur, osa, marino_ballena, perez_zeledon, dominical, uvita, jaco, cartago, turrialba, corcovado, golfo_dulce, central_pacific, sarapiqui, los_santos, golfito
- dificultad: fácil | moderado | exigente | por_confirmar
- precio: ONLY the price published on url_fuente (number, USD). Blank if not published. Never invent.
- lat/lng: approximate coordinates of the tour start/place (4 decimals) — OK to use well-known place coordinates.
- descripcion_*: 1–2 own-words sentences (do NOT copy operator text verbatim).
- incluye: short semicolon list as published, blank if not shown.
- url_fuente: the operator's own tour page you actually opened (web_fetch). Prefer operator sites over OTAs (Viator/GetYourGuide only if the operator has no site, and note it).
- Each row = a distinct real tour product currently offered. No duplicates of the 43 existing catalog tours unless a different operator.
- notas: anything uncertain (e.g., "precio de 2025", "temporada dic-abr").

## Nuevas tandas revisadas

- Añadir al final las columnas `revisado_el` (YYYY-MM-DD) y `estado_precio` (vacío o `por_confirmar`).
- La fecha corresponde a la revisión manual de esa ficha, nunca a la regeneración del archivo. Las tandas antiguas conservan su fecha original; una nueva tanda no las actualiza.
- Usar `por_confirmar` y precios vacíos cuando la tarifa aplicable requiera validar residencia, edad, grupo, temporada, impuestos o condiciones comerciales. Esto no significa que la fuente carezca de precios.
- Una ficha por experiencia distinta. No multiplicar fechas, idiomas, horarios, nacionalidades, tamaños de grupo o extras para inflar el catálogo.
- Coordenadas aproximadas de la zona, no instrucciones de llegada ni un punto de encuentro confirmado.
- Descripciones bilingües originales y breves; conservar contradicciones en notas para resolver al cotizar. No prometer inclusiones inciertas.
- El generador rechaza fechas inválidas/futuras, columnas desalineadas, identificadores repetidos, productos repetidos del mismo operador, coordenadas no finitas y precios contradictorios en tandas fechadas.
- Las fichas generadas siguen siendo de consulta. Publicar una fuente no aprueba al proveedor, no verifica cupos y no autoriza cobrar.
