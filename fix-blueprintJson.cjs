const fs = require('fs');

let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

// Regex to find the blueprintJson objects
const regex = /blueprintJson:\s*\{([\s\S]*?)nodes:\s*\[([\s\S]*?)\],([\s\S]*?)connections:\s*\{([\s\S]*?)\}\s*\}/g;

content = content.replace(regex, function(match, beforeNodes, nodesArrayContent, beforeConnections, connectionsContent) {
    
    // Avoid double injection in blueprintJson
    if (nodesArrayContent.includes('[ERROR HANDLER] Catch Workflow Exceptions')) {
        return match;
    }

    const newNodes = ",\n" +
        "        {\n" +
        "          parameters: { dataType: 'string', value1: '={{$json.body.trigger}}', rules: { rules: [{ operation: 'exists' }] } },\n" +
        "          name: '[ROUTING] Data Validation Switch',\n" +
        "          type: 'n8n-nodes-base.switch',\n" +
        "          typeVersion: 1,\n" +
        "          position: [1500, 300]\n" +
        "        },\n" +
        "        {\n" +
        "          parameters: { values: { string: [{ name: 'processedAt', value: '={{$now}}' }] }, options: {} },\n" +
        "          name: '[TRANSFORM] Payload Standardizer',\n" +
        "          type: 'n8n-nodes-base.set',\n" +
        "          typeVersion: 1,\n" +
        "          position: [1700, 300]\n" +
        "        },\n" +
        "        {\n" +
        "          parameters: {},\n" +
        "          name: '[ERROR HANDLER] Catch Workflow Exceptions',\n" +
        "          type: 'n8n-nodes-base.errorTrigger',\n" +
        "          typeVersion: 1,\n" +
        "          position: [100, 500]\n" +
        "        },\n" +
        "        {\n" +
        "          parameters: { chatId: '-1002348576921', text: '=*⚠️ ERROR DE EJECUCIÓN EN FLUJO N8N*=\\n\\nFlujo: `{{$workflow.name}}`\\nNodo: `{{$json.execution.error.nodeName}}`\\nError: `{{$json.execution.error.message}}`\\n\\nRevisar consola de operaciones (n8n).', additionalFields: { parse_mode: 'Markdown' } },\n" +
        "          name: '[OPS ALERT] Telegram Ops Notify',\n" +
        "          type: 'n8n-nodes-base.telegram',\n" +
        "          typeVersion: 1.1,\n" +
        "          position: [300, 500],\n" +
        "          credentials: { telegramApi: { id: '5NiYz8gX64lPYIdK', name: 'Google Service Account' } }\n" +
        "        }";

    // Add connections
    let newConnections = connectionsContent;
    if (newConnections.trim() === '') {
        newConnections = `
        "[ERROR HANDLER] Catch Workflow Exceptions": { main: [[{ node: "[OPS ALERT] Telegram Ops Notify", type: "main", index: 0 }]] }`;
    } else {
        newConnections = newConnections.trim();
        if (newConnections.endsWith('}')) {
            newConnections += `,
        "[ERROR HANDLER] Catch Workflow Exceptions": { main: [[{ node: "[OPS ALERT] Telegram Ops Notify", type: "main", index: 0 }]] }`;
        } else {
             newConnections += `
        "[ERROR HANDLER] Catch Workflow Exceptions": { main: [[{ node: "[OPS ALERT] Telegram Ops Notify", type: "main", index: 0 }]] }`;
        }
    }

    return "blueprintJson: {" + beforeNodes + "nodes: [" + nodesArrayContent + newNodes + "\n      ]," + beforeConnections + "connections: {\n        " + newConnections + "\n      }\n    }";
});

fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
console.log('blueprintJson nodes configured and executed.');
