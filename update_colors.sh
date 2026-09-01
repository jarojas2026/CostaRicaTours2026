#!/bin/bash
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  -e 's/orange-950/emerald-950/g' \
  -e 's/orange-900/emerald-900/g' \
  -e 's/orange-800/emerald-800/g' \
  -e 's/orange-700/teal-700/g' \
  -e 's/orange-600/teal-600/g' \
  -e 's/orange-500/amber-500/g' \
  -e 's/orange-400/amber-400/g' \
  -e 's/orange-300/amber-300/g' \
  -e 's/orange-200/emerald-200/g' \
  -e 's/orange-100/emerald-100/g' \
  -e 's/orange-50/emerald-50/g'
