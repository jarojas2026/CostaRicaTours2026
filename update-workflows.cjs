const fs = require('fs');

let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

const regex = /nodes:\s*\[([\s\S]*?)\]\s*,/g;

content = content.replace(regex, (match, nodesContent) => {
    // Determine the current max id (n1, n2... nX)
    const idMatches = [...nodesContent.matchAll(/id:\s*'n(\d+)'/g)];
    let maxId = 0;
    if (idMatches.length > 0) {
        maxId = Math.max(...idMatches.map(m => parseInt(m[1])));
    }
    
    // Check if we already added enterprise nodes
    if (nodesContent.includes('[ERROR HANDLER]')) {
        return match;
    }

    let extraNodes = `
      { id: 'n${maxId + 1}', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'n${maxId + 2}', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'n${maxId + 3}', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'n${maxId + 4}', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours' }`;
      
    // Append the extra nodes before the closing bracket of nodes array
    return match.replace(/\]\s*,$/, `,${extraNodes}\n    ],`);
});

// Now update nodesCount
content = content.replace(/nodesCount:\s*(\d+)/g, (match, countStr) => {
    let count = parseInt(countStr);
    return `nodesCount: ${count + 4}`;
});

fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
console.log("Workflows updated.");
