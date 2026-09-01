import re

with open('src/components/AIAssistant.tsx', 'r') as f:
    content = f.read()

# Add states
states_str = """
  const [thinkingMode, setThinkingMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
"""
content = content.replace("const suggestedQuestions = SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS['en'];", states_str + "\n  const suggestedQuestions = SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS['en'];")

# Add icons
content = content.replace("import { Bot, Send, Sparkles, Mic, MicOff, User, RefreshCw, X, MessageSquare, Compass, ArrowRight, Trash2, HelpCircle, CheckCircle2, Ticket } from 'lucide-react';", "import { Bot, Send, Sparkles, Mic, MicOff, User, RefreshCw, X, MessageSquare, Compass, ArrowRight, Trash2, HelpCircle, CheckCircle2, Ticket, Image as ImageIcon, BrainCircuit, XCircle } from 'lucide-react';")

# Image file handler
handle_image_str = """
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
"""
content = content.replace("const scrollToBottom = () => {", handle_image_str + "\n  const scrollToBottom = () => {")

# Update handleSendMessage
handle_send_str = """
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if ((!query.trim() && !selectedImage) || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query || (selectedImage ? (language === 'es' ? 'Imagen adjunta' : 'Image attached') : ''),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessagesList = [...messages, userMsg];
    setMessages(newMessagesList);
    if (!textToSend) setInputMessage('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    const historyPayload = newMessagesList
      .filter((m) => !m.id.startsWith('welcome'))
      .map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

    try {
      if (imageToSend) {
        // Handle Image Analysis
        const response = await fetch('/api/gemini/analyze-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaBase64: imageToSend.split(',')[1],
            mimeType: imageToSend.split(';')[0].split(':')[1] || 'image/jpeg',
            prompt: query || 'Analiza esta imagen',
            language
          }),
        });
        const data = await response.json();
        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.analysis || '...',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const isUrgent = /urgent|urgencia|dringend/i.test(query);
      const endpoint = isUrgent ? '/api/gemini/booking/urgent' : '/api/gemini/concierge';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          language,
          thinking: thinkingMode,
          context: {
            bookings: userBookings,
          },
        }),
      });

      const data = await response.json();
"""

content = re.sub(r'''  const handleSendMessage = async \(textToSend\?: string\) => \{.*?const data = await response\.json\(\);''', handle_send_str, content, flags=re.DOTALL)

# Header controls for thinking mode
header_controls = """
            <div className="flex items-center gap-2">
              <button
                onClick={() => setThinkingMode(!thinkingMode)}
                title={language === 'es' ? 'Modo de Pensamiento Profundo' : 'Deep Thinking Mode'}
                className={`p-2 transition-colors rounded-lg border flex items-center gap-1 text-xs font-bold ${
                  thinkingMode 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                    : 'bg-orange-950 text-neutral-400 border-white/10 hover:text-amber-400'
                }`}
              >
                <BrainCircuit className="w-4 h-4" />
                <span className="hidden sm:inline">Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
              </button>
              
              <button
"""
content = content.replace('''            <div className="flex items-center gap-2">\n              <button''', header_controls)

# Add image upload to input form
input_form = """
          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-orange-950 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Upload preview" className="w-12 h-12 rounded object-cover border border-orange-500/50" />
                <span className="text-xs text-orange-200">Image ready to send</span>
              </div>
              <button onClick={() => setSelectedImage(null)} className="text-neutral-400 hover:text-red-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <div className="p-3 sm:p-4 bg-orange-950 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 relative"
            >
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-xl border bg-orange-900 border-white/10 text-orange-400 hover:bg-orange-800 transition-colors disabled:opacity-50"
                title="Upload Image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleMicClick}
"""
content = content.replace('''          {/* Input Form */}\n          <div className="p-3 sm:p-4 bg-orange-950 border-t border-white/10">\n            <form\n              onSubmit={(e) => {\n                e.preventDefault();\n                handleSendMessage();\n              }}\n              className="flex gap-2 relative"\n            >\n              <button\n                type="button"\n                onClick={handleMicClick}''', input_form)

# Enable button when image is selected
submit_btn = """              <button
                type="submit"
                disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                className="bg-orange-600 hover:bg-orange-600 text-white font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"
              >"""
content = re.sub(r'''              <button\n                type="submit"\n                disabled=\{isLoading \|\| !inputMessage\.trim\(\)\}\n                className="bg-orange-600 hover:bg-orange-600 text-white font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"\n              >''', submit_btn, content)

with open('src/components/AIAssistant.tsx', 'w') as f:
    f.write(content)

