import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# find `<div className="min-h-screen bg-orange-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white relative">`
# change to include `pb-20 xl:pb-0`

content = content.replace(
    'className="min-h-screen bg-orange-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white relative"',
    'className="min-h-screen bg-orange-950 text-neutral-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white relative pb-16 xl:pb-0"'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
