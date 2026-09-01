#!/bin/bash
sed -i 's/return `₡${crc.toLocaleString()}`/return `₡${crc.toLocaleString()}`/g' src/utils/i18n.ts
sed -i 's/return `€${eur.toLocaleString()} EUR`;/return `€${eur.toLocaleString()}`;/g' src/utils/i18n.ts
sed -i 's/return `£${gbp.toLocaleString()} GBP`;/return `£${gbp.toLocaleString()}`;/g' src/utils/i18n.ts
sed -i 's/return `C$${cad.toLocaleString()} CAD`;/return `C$${cad.toLocaleString()}`;/g' src/utils/i18n.ts
sed -i 's/return `$${amountUSD.toLocaleString()} USD`;/return `$${amountUSD.toLocaleString()}`;/g' src/utils/i18n.ts
