#!/bin/bash
sed -i 's/return `₡${crc.toLocaleString()}`;/return `₡${crc.toLocaleString()} CRC`;/g' src/utils/i18n.ts
sed -i 's/return `$${amountUSD.toLocaleString()} USD`;/return `$${amountUSD.toLocaleString()} USD`;/g' src/utils/i18n.ts
