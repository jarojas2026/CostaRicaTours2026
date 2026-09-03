const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const targetInstruction = `- Despídete siempre con calidez costarricense ("¡Pura Vida!").`;
const newInstruction = `- Despídete siempre con calidez costarricense ("¡Pura Vida!").
- GEN UI (IMPORTANTE): Cuando recomiendes, menciones o hables sobre un tour específico que se encuentre en nuestro catálogo, DEBES incluir la etiqueta [TOUR:id-del-tour] en tu mensaje (por ejemplo: "[TOUR:arenal-volcano-hotsprings]"). Esto hará que la interfaz de usuario renderice una tarjeta interactiva hermosa y visual del tour directamente en el chat para el usuario. No inventes IDs, usa los nombres de los destinos más conocidos y el sistema intentará mapearlos, pero trata de usar minúsculas y guiones (ej. [TOUR:manuel-antonio-park], [TOUR:monteverde-cloud-forest]).`;

content = content.replace(targetInstruction, newInstruction);

fs.writeFileSync('server.ts', content);
console.log('System prompt updated for GenUI');
