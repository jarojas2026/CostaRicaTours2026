import re

with open('src/components/FloatingWhatsApp.tsx', 'r') as f:
    content = f.read()

replacement = """              </div>
              
              {showTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-2 ml-2"
                >
                  <div className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-200/60 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">{language === 'es' ? 'Escribiendo...' : 'Typing...'}</span>
                </motion.div>
              )}

              {/* Chat Input */}"""

content = re.sub(r'              </div>\s+{\/\* Chat Input \*\/}', replacement, content)

with open('src/components/FloatingWhatsApp.tsx', 'w') as f:
    f.write(content)
