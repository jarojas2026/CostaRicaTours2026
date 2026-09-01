#!/bin/bash
find src -type f -name "*.tsx" -o -name "*.ts" | while read -r file; do
    sed -i 's/teal-/orange-/g' "$file"
    sed -i 's/emerald-/orange-/g' "$file"
done
