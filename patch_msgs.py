import re

with open('src/components/FloatingWhatsApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement1 = """                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-200/60 mb-4 inline-block max-w-[90%]">
                  <p className="text-sm text-neutral-800 font-medium whitespace-pre-wrap">{t.prompt}<MessageStatus isBot={true} /></p>
                </div>"""

content = content.replace("""                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-200/60 mb-4 inline-block max-w-[90%]">
                  <p className="text-sm text-neutral-800 font-medium">{t.prompt}</p>
                </div>""", replacement1)

replacement2 = """                    <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium ${msg.role === 'user' ? 'bg-[#25D366] text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-md text-neutral-800 border border-neutral-200/60 rounded-tl-sm'}`}>
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                      <MessageStatus isBot={msg.role === 'bot'} />
                    </div>"""

content = content.replace("""                    <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm text-sm font-medium ${msg.role === 'user' ? 'bg-[#25D366] text-white rounded-tr-sm' : 'bg-white/80 backdrop-blur-md text-neutral-800 border border-neutral-200/60 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>""", replacement2)

with open('src/components/FloatingWhatsApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
