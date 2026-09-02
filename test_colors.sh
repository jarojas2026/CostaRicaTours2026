#!/bin/bash
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  -e 's/bg-emerald-950/bg-stone-950/g' \
  -e 's/bg-emerald-900/bg-stone-900/g' \
  -e 's/bg-emerald-800/bg-stone-800/g' \
  -e 's/border-emerald-500/border-teal-500/g' \
  -e 's/text-emerald-200/text-teal-200/g' \
  -e 's/text-emerald-300/text-teal-300/g' \
  -e 's/text-emerald-400/text-teal-400/g' \
  -e 's/text-emerald-500/text-teal-500/g' \
  -e 's/bg-emerald-500/bg-teal-500/g' \
  -e 's/bg-emerald-600/bg-teal-600/g' \
  -e 's/hover:bg-emerald-800/hover:bg-stone-800/g' \
  -e 's/hover:bg-emerald-700/hover:bg-stone-700/g' \
  -e 's/amber-500/orange-500/g' \
  -e 's/amber-400/orange-400/g' \
  -e 's/amber-300/orange-300/g' \
  -e 's/amber-200/orange-200/g'
