#!/bin/bash
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  -e 's/bg-emerald-50/bg-stone-50/g' \
  -e 's/bg-emerald-100/bg-stone-100/g' \
  -e 's/bg-emerald-200/bg-stone-200/g' \
  -e 's/text-emerald-50/text-stone-50/g' \
  -e 's/text-emerald-100/text-stone-100/g' \
  -e 's/text-emerald-200/text-stone-200/g' \
  -e 's/border-emerald-50/border-stone-50/g' \
  -e 's/border-emerald-100/border-stone-100/g' \
  -e 's/border-emerald-200/border-stone-200/g' \
  -e 's/emerald-700/teal-700/g' \
  -e 's/emerald-600/teal-600/g' \
  -e 's/emerald-300/teal-300/g' \
  -e 's/emerald-400/teal-400/g' \
  -e 's/emerald-500/teal-500/g' \
  -e 's/emerald-800/stone-800/g' \
  -e 's/emerald-900/stone-900/g' \
  -e 's/emerald-950/stone-950/g'
