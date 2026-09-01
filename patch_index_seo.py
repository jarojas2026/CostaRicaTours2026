import re

with open('index.html', 'r') as f:
    content = f.read()

new_meta = """    <meta name="description" content="Descubre Costa Rica con expertos locales. Reservas exclusivas de tours de aventura, naturaleza y lujo. Volcán Arenal, Manuel Antonio, Monteverde y más. Book your Costa Rica adventure today." />
    <meta name="keywords" content="costa rica tours, volcan arenal, monteverde, rafting, manuel antonio, luxury travel costa rica, eco-tourism, wildlife costa rica, pura vida, costa rica vacations" />"""

content = re.sub(r'    <meta name="description" content=".*?" />\n    <meta name="keywords" content=".*?" />', new_meta, content)

with open('index.html', 'w') as f:
    f.write(content)
