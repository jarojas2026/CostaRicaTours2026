const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const additionalAgents = `// Agent 3: Contingency Engine (Manejo de Excepciones y Clima)
// Purpose: Handles weather alerts, lack of availability, and formulates alternative solutions.
app.post("/api/agents/contingency", async (req, res) => {
  try {
    const { tourName, date, weatherAlert, supplierStatus } = req.body;
    if (!ai) return res.status(503).json({ error: "AI not configured" });

    const prompt = \`Analiza contingencia: Tour="\${tourName}", Fecha="\${date}", Clima="\${weatherAlert}", Proveedor="\${supplierStatus}".\`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres el 'Agente de Contingencias'. Analiza alertas climáticas extremas o rechazos de disponibilidad por parte de proveedores locales. Genera un plan de mitigación, alternativas de tours de valor similar en zonas no afectadas, y un borrador de correo empático y persuasivo para el cliente ofreciendo las alternativas con 'un solo clic'. Devuelve un JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionRequired: { type: Type.STRING, description: "Acción requerida (ej: 'Sugerir Alternativa', 'Reembolsar', 'Re-agendar')" },
            alternativeTours: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sugerencias de tours alternativos (ej: 'Tour a la Montaña' si la playa está inundada)." },
            draftResponse: { type: Type.STRING, description: "Borrador de email empático ofreciendo las opciones." }
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Contingency Agent Error:", error);
    res.status(500).json({ error: "Contingency failed" });
  }
});

// Bucle de Autoaprendizaje (Self-Healing) - Registro de Excepciones
const exceptionsLog: any[] = [];

app.post("/api/agents/log_exception", (req, res) => {
  const { errorContext, rawData, agentName } = req.body;
  exceptionsLog.push({ timestamp: new Date().toISOString(), agentName, errorContext, rawData });
  res.json({ success: true, count: exceptionsLog.length });
});

app.get("/api/agents/exceptions", (req, res) => {
  res.json({ exceptionsLog });
});

// Agent 4: Supervisor Agent (Self-Healing Loop)
// Purpose: Periodically reviews failure logs to optimize prompts and parsing logic.
app.post("/api/agents/supervisor", async (req, res) => {
  try {
    if (!ai) return res.status(503).json({ error: "AI not configured" });
    if (exceptionsLog.length === 0) {
      return res.json({ analysis: "No hay excepciones recientes registradas. El sistema opera a un 100% de éxito.", detectedPattern: "Stable" });
    }

    const prompt = \`Analiza los siguientes errores operativos (JSON Parsing, format errors, timeout): \${JSON.stringify(exceptionsLog.slice(-5))}\`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: prompt,
      config: {
        systemInstruction: "Eres el 'Agente Supervisor'. Tu función es el Autoaprendizaje (Self-Healing). Analizas registros de excepciones (errores al leer emails de operadores informales, timeouts, fallas de validación JSON) y generas recomendaciones técnicas. Tu objetivo es ajustar dinámicamente las instrucciones (prompts) de los otros agentes para que entiendan la informalidad y no fallen la próxima vez. Devuelve JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedPattern: { type: Type.STRING, description: "Patrón de fallo (ej: 'El proveedor usa formato de hora militar', 'El correo viene sin fechas')" },
            promptAdjustments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nuevas instrucciones sugeridas para inyectar a los Agentes operativos." },
            recommendedSystemFix: { type: Type.STRING, description: "Ajuste recomendado a nivel de código o n8n workflow." }
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Supervisor Agent Error:", error);
    res.status(500).json({ error: "Supervisor failed" });
  }
});

// Start Express + Vite`;

content = content.replace('// Start Express + Vite', additionalAgents);
fs.writeFileSync('server.ts', content);
