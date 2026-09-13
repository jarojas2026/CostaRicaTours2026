const fs = require('fs');

let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

// The injected block looks like this:
/*
,
      { id: 'nX', name: '[ROUTING] Data Validation Switch', type: 'n8n-nodes-base.switch', description: 'Evalúa la integridad del payload y redirige si faltan datos críticos' },
      { id: 'nY', name: '[TRANSFORM] Payload Standardizer', type: 'n8n-nodes-base.set', description: 'Mapeo, limpieza y formato de variables (Fechas, Monedas, Nombres)' },
      { id: 'nZ', name: '[ERROR HANDLER] Catch Workflow Exceptions', type: 'n8n-nodes-base.errorTrigger', description: 'Intercepta cualquier fallo en ejecución del flujo para prevención de caídas' },
      { id: 'nW', name: '[OPS ALERT] Telegram Ops Notify', type: 'n8n-nodes-base.telegram', description: 'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours' }
*/

// Regex to remove the wrongly injected block anywhere
content = content.replace(/,\s*\{\s*id:\s*'[^']+',\s*name:\s*'\[ROUTING\] Data Validation Switch'[\s\S]*?'Envía alerta de diagnóstico al equipo de soporte de Costa Rica Tours'\s*\}/g, '');

// Also nodesCount was incremented by 4, let's decrement it.
// nodesCount: \d+
content = content.replace(/nodesCount:\s*(\d+)/g, (match, count) => {
    return `nodesCount: ${parseInt(count) - 4}`;
});

fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
console.log('Fixed file.');
