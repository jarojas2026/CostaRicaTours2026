import re

with open('src/components/FloatingWhatsApp.tsx', 'r') as f:
    content = f.read()

# I will replace the starting of the false branch to include a fragment
content = content.replace(
    """) : (
                  <div className="rounded-3xl overflow-hidden border-2 border-orange-500/50 relative bg-black aspect-square shadow-inner group">""",
    """) : (
                  <>
                    <div className="rounded-3xl overflow-hidden border-2 border-orange-500/50 relative bg-black aspect-square shadow-inner group">"""
)

# And add the closing fragment before the )}
content = content.replace(
    """                  </div>
                )}
              </div>""",
    """                  </div>
                  </>
                )}
              </div>"""
)

with open('src/components/FloatingWhatsApp.tsx', 'w') as f:
    f.write(content)
