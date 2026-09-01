import re

with open('server.ts', 'r') as f:
    content = f.read()

# Fix the import to include ThinkingLevel (if it exists, but we can just use "HIGH" if it doesn't. We'll try to add it)
content = content.replace('import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";', 'import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";')

# 1. Update /api/gemini/concierge to use gemini-3.5-flash for general tasks (already does).
# But the instruction says: "You MUST add a multi-turn chat interface... Use gemini-3.1-pro-preview for particularly complex tasks, gemini-3.5-flash for general tasks..."
# The user wants thinking mode for most complex queries. Let's add a "thinking" flag in the request body for concierge.
concierge_body = r"""    const { message, history = [], language = "es", context = {}, thinking = false } = req.body;"""
content = re.sub(r'const { message, history = \[\], language = "es", context = \{\} } = req\.body;', concierge_body, content)

concierge_call = r"""
    const modelToUse = thinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
    const configToUse: any = {
      systemInstruction: systemPrompt,
    };
    if (thinking) {
      configToUse.thinkingLevel = "HIGH";
    } else {
      configToUse.temperature = 0.7;
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: configToUse,
    });
"""
content = re.sub(r'''    const response = await ai\.models\.generateContent\(\{
      model: "gemini-3\.5-flash",
      contents: contents,
      config: \{
        systemInstruction: systemPrompt,
        temperature: 0\.7,
      \},
    \}\);''', concierge_call, content)

# 2. Update /api/gemini/analyze-media to use gemini-3.1-pro-preview
content = content.replace('model: "gemini-3.5-flash",', 'model: "gemini-3.1-pro-preview",', 1)

# 3. /api/gemini/itinerary uses gemini-3.1-flash-lite, which fits "tasks that should happen fast".
# Let's verify that's there. It is!

with open('server.ts', 'w') as f:
    f.write(content)
