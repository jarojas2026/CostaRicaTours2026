const fs = require('fs');

let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

// The outer nodes array is ALWAYS followed by `samplePayload:`
const regex = /nodesCount:\s*(\d+),\s*slaTarget:\s*'([^']+)',\s*nodes:\s*\[([\s\S]*?)\]\s*,\s*samplePayload:/g;

content = content.replace(regex, (match, countStr, sla, nodesContent) => {
    let count = parseInt(countStr);
    
    // Determine the current max id (n1, n2... nX)
    const idMatches = [...nodesContent.matchAll(/id:\s*'n(\d+)'/g)];
    let maxId = 0;
    if (idMatches.length > 0) {
        maxId = Math.max(...idMatches.map(m => parseInt(m[1])));
    }
    
    // Avoid double injection
    if (nodesContent.includes('[ERROR HANDLER]')) {
        return match;
    }

    let extraNodes = `,
      { id: 'n${maxId + 1}', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n${maxId + 2}', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n${maxId + 3}', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n${maxId + 4}', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours (Google Service Account ID: 5NiYz8gX64lPYIdK)' }`;
      
    // Replace the trailing bracket of the inner content
    let newNodesContent = nodesContent.trim().replace(/}$/, `}${extraNodes}`);
    if (!newNodesContent.includes(extraNodes)) {
      // fallback if regex replace fails on `}$`
      newNodesContent += extraNodes;
    }

    let newCount = count + 4;
    return `nodesCount: ${newCount},\n    slaTarget: '${sla}',\n    nodes: [\n      ${newNodesContent}\n    ],\n    samplePayload:`;
});

fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
console.log("Workflows safely updated.");
