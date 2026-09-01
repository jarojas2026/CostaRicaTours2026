import re

with open('src/components/FloatingWhatsApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Trash2 to lucide-react imports
content = content.replace("VolumeX, Share2, Download } from 'lucide-react';", "VolumeX, Share2, Download, Trash2 } from 'lucide-react';")

# 2. Add handleClearChat
clear_chat_func = """
  const handleClearChat = () => {
    setChatHistory([]);
    localStorage.removeItem('whatsapp_chat_history');
  };

  const handleSendMessage"""
content = content.replace("  const handleSendMessage", clear_chat_func)

# 3. Replace .slice(-5) with .slice(-50)
content = content.replace(".slice(-5)", ".slice(-50)")

# 4. Add the clear history button in the header
button_html = """              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClearChat}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={language === 'es' ? 'Limpiar historial' : 'Clear history'}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button """

content = content.replace('              <div className="flex items-center gap-1">\n                <button ', button_html)

with open('src/components/FloatingWhatsApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
