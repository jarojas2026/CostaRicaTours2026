# Guía Oficial de Auditoría y Metodología: "Update Everything" en Google AI Studio

## Resumen Ejecutivo

En el ecosistema de **Google AI Studio** y el modo **Build (Vibe Coding)** impulsado por el agente **Antigravity** y los modelos Gemini (Gemini 1.5 Pro, 2.0 y 2.5), la instrucción de ingeniería de prompts **"Update everything in real time as sliders move"** (o *"Actualiza todo en tiempo real a medida que se mueven los controles deslizantes"*) constituye el estándar para exigir código reactivo con enlace bidireccional (*two-way data binding*), escuchadores de eventos continuos y sincronización automática del DOM o el estado de React.

Este documento consolida las directrices de auditoría, buenas prácticas de prompts para proyectos complejos, mantenimiento de dependencias y resolución de cuellos de botella técnicos.

---

## 1. El Patrón "Update Everything" en Código y Simulaciones

### 1.1. Estructura Estándar de la Industria
Para generar herramientas interactivas sin botones manuales de cálculo ni recargas de página:

```text
"Create an interactive [nombre de la herramienta/simulación] as a single HTML file.
Include sliders for [variable 1] (range: X-Y), [variable 2] (range: X-Y).
Show a [tipo de gráfico o visualización] and display the final result.
Update everything in real time as sliders move."
```

### 1.2. Mecánica Subyacente
1. **Unificación de Archivos (`as a single HTML file`)**: Obliga al modelo a integrar HTML5 semántico, estilos CSS limpios y JavaScript ES6 en un único bloque ejecutable inmediatamente en el *Live Preview*.
2. **Restricción de Rangos Numéricos (`Include sliders for...`)**: Elimina la dispersión de valores arbitrarios y reduce las alucinaciones matemáticas del LLM.
3. **Atajo Semántico de Reactividad (`Update everything...`)**: Comunica al generador de código que debe vincular cada control a escuchadores de eventos (`input`, `change`) y una función central de renderizado o estado compartido.

---

## 2. Desarrollo en Modo Build (Vibe Coding) con Antigravity

El modo Build permite iterar y refactorizar aplicaciones completas mediante lenguaje natural continuo.

### 2.1. Gestión de Instrucciones del Sistema y Prompt Base
* **Problema**: El orquestador interno de AI Studio inyecta un prompt base que puede tender a revertir nombres o configuraciones si no se delimita la jerarquía.
* **Solución**: Declarar directrices persistentes en los archivos `AGENTS.md` o `GEMINI.md` en la raíz del repositorio. El motor de AI Studio lee e incorpora automáticamente estos archivos en cada turno de inferencia, garantizando la preservación de la arquitectura.

### 2.2. Buenas Prácticas de Prompts para Refactorización Masiva
* **Delimitación de Contexto**: Utilizar etiquetas semánticas (`<contexto>`, `<requerimiento>`) para separar datos del código a modificar.
* **Salidas Estructuradas y Control de Tipos**: Usar esquemas TypeScript estrictos e interfaces centralizadas (`src/types.ts`).
* **Pensamiento Extendido / Reasoning**: Aprovechar el presupuesto de razonamiento (*thinking mode*) de los modelos Gemini para garantizar que las transformaciones matemáticas y de estado sean consistentes en toda la base de código.

---

## 3. Actualización de Plataforma, SDKs y Entorno de Ejecución

* **SDK de Node.js**: Mantener `@google/genai` actualizado con `npm update @google/genai`.
* **SDK de Python**: `pip install --upgrade google-genai`.
* **Transición de Prototipo a Producción (Google Maps / Cloud Platform)**:
  * Las aplicaciones en AI Studio inician con llaves Demo sin costo.
  * Para despliegues en producción y consumo sin restricciones de cuota (`RESOURCE_EXHAUSTED`), vincular un proyecto de Google Cloud con facturación activa desde la consola de GCP.

---

## 4. Auditoría y Solución de Problemas Operativos (Troubleshooting)

### 4.1. Enrutamiento SPA en Netlify (Error 404 al Recargar Rutas Profundas)
* **Causa**: Netlify busca archivos físicos para cada ruta URL en lugar de delegar el enrutamiento a `index.html`.
* **Solución permanente implementada**:
  * Archivo `public/_redirects`: `/*    /index.html   200`
  * Archivo `netlify.toml` en raíz con regla de reescritura de estado 200 y cabeceras de seguridad.

### 4.2. Seguridad en Firestore (`firestore.rules`)
* Regla global de *Denegación por Defecto* (`allow read, write: if false;`).
* Verificación de usuario autenticado (`request.auth != null`) en lecturas de reservas personales y sanitización estricta de tipos de datos en escrituras.

### 4.3. Agente Antigravity en Entornos de Escritorio
Si en instalaciones de escritorio de Antigravity ocurren interrupciones repetidas por terminales de fondo:
1. Cerrar procesos del agente.
2. Limpiar `%LOCALAPPDATA%\Temp\antigravity-*`.
3. Establecer el modo de actualización a Manual en la configuración del agente.
