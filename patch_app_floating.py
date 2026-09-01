import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# using regex
content = re.sub(
    r"<FloatingWhatsApp.*?/>",
    "<FloatingWhatsApp language={language} initialMessage={whatsappMessage} onOpenAIAssistant={() => setActiveTab('ai')} onSelectTour={setSelectedTour} />",
    content,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
