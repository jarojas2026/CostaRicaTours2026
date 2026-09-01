import re

with open('src/components/AIAssistant.tsx', 'r') as f:
    content = f.read()

# Add motion import
content = content.replace("import { Language, Tour, BookingRequest } from '../types';", "import { Language, Tour, BookingRequest } from '../types';\nimport { motion, AnimatePresence } from 'motion/react';")

# Animate messages
msg_render = r"""            {messages.map((msg) => (
              <div
"""

msg_render_new = r"""            <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
"""

content = content.replace(msg_render, msg_render_new)

# We need to close AnimatePresence
content = content.replace("                </div>\n              </div>\n            ))} ", "                </div>\n              </motion.div>\n            ))}\n            </AnimatePresence>")

# If it didn't match the exact close (because of trailing spaces), let's use regex
content = re.sub(r'                </div>\n              </div>\n            \)\)}', '                </div>\n              </motion.div>\n            ))}\n            </AnimatePresence>', content)
content = content.replace('<div\n                key={msg.id}', '<motion.div\n                key={msg.id}')
content = content.replace('</div>\n              </div>\n            ))}', '</div>\n              </motion.div>\n            ))}\n            </AnimatePresence>')


with open('src/components/AIAssistant.tsx', 'w') as f:
    f.write(content)
