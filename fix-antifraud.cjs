const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetContent = `    const data = req.body.booking || req.body || {};
    const total = Number(data.totalUSD || data.montoUSD || 0);
    const cliente = data.cliente || data.customer || {};
    const countryCard = (cliente.paisEmisorTarjeta || data.paisEmisorTarjeta || 'US').toUpperCase();
    const countryIP = (cliente.paisIP || data.paisIP || 'US').toUpperCase();
    const attempts = Number(cliente.intentosPrevios24h ?? data.intentosPrevios24h ?? 1);
    const email = (cliente.email || data.email || '').toLowerCase();

    let score = 5;
    const flags: string[] = [];

    // Discordancia geográfica BIN vs IP
    if (countryCard !== countryIP) {
      score += 35;
      flags.push(\`DISCORDANCIA_PAIS (Tarjeta: \${countryCard} vs Conexión IP: \${countryIP})\`);
    }

    // Monto elevado
    if (total >= 1200) {
      score += 20;
      flags.push(\`MONTO_ELEVADO_USD ($\${total} USD requiere verificación 3D Secure)\`);
    }

    // Tasa de reintentos
    if (attempts >= 3) {
      score += 35;
      flags.push(\`ALTA_VELOCIDAD_TRANSACCIONAL (\${attempts} intentos en 24h)\`);
    }

    // Correos temporales
    if (/@(tempmail|10minutemail|throwaway|disposable|mailinator)\\./i.test(email)) {
      score += 50;
      flags.push(\`CORREO_TEMPORAL_DETECTADO (\${email})\`);
    }

    const decision = score >= 70 ? 'BLOQUEADO' : score >= 40 ? 'REVISION_MANUAL' : 'APROBADO';

    res.json({
      exito: true,
      autorizado: decision === 'APROBADO',
      decision,
      riskScore: score,
      flags,
      reservaId: data.idReserva || data.id || 'CRT-TEST-FRAUD',
      recomendacion: decision === 'APROBADO' 
        ? 'Transacción legítima. Proceder con emisión de voucher digital.'
        : decision === 'REVISION_MANUAL'
        ? 'Solicitar verificación 3D Secure o confirmación telefónica al titular.'
        : 'Bloquear transacción y reportar intento sospechoso en pasarela.',
      mensaje: 'Evaluación antifraude completada mediante matriz de riesgo n8n.'
    });`;

const newContent = `    // Integración de Inteligencia Artificial (Claude Vertex) para Evaluación de Riesgo y Fraude
    console.log('🤖 Solicitando auditoría antifraude a Claude (Vertex AI)...');
    try {
      const auditResult = await analyzeOperationalRiskWithClaude(payload);
      
      // Enviar resultado a n8n para registro
      await dispatchToN8N('/webhook/antifraude-evaluacion-resultado', { 
        trigger: 'RESULTADO_ANTIFRAUDE_IA', 
        reservaId: payload.reservaId || payload.id || 'N/A',
        auditResult 
      }).catch(() => null);

      return res.json({
        exito: true,
        autorizado: auditResult.autorizado,
        decision: auditResult.decision,
        riskScore: auditResult.riskScore,
        flags: auditResult.flags,
        reservaId: payload.reservaId || payload.id || 'CRT-TEST-FRAUD',
        recomendacion: auditResult.recomendacion,
        mensaje: 'Evaluación antifraude completada mediante IA (Claude).',
        analisisIA: auditResult.analisisIA
      });
    } catch (aiError: any) {
      console.warn('⚠️ Error con Claude antifraude. Se utilizará heurística básica.', aiError.message);
      // Fallback heurístico si la IA falla
      const data = req.body.booking || req.body || {};
      const total = Number(data.totalUSD || data.montoUSD || 0);
      const cliente = data.cliente || data.customer || {};
      const countryCard = (cliente.paisEmisorTarjeta || data.paisEmisorTarjeta || 'US').toUpperCase();
      const countryIP = (cliente.paisIP || data.paisIP || 'US').toUpperCase();
      const attempts = Number(cliente.intentosPrevios24h ?? data.intentosPrevios24h ?? 1);
      const email = (cliente.email || data.email || '').toLowerCase();
  
      let score = 5;
      const flags: string[] = [];
  
      if (countryCard !== countryIP) {
        score += 35;
        flags.push(\`DISCORDANCIA_PAIS (Tarjeta: \${countryCard} vs Conexión IP: \${countryIP})\`);
      }
      if (total >= 1200) {
        score += 20;
        flags.push(\`MONTO_ELEVADO_USD ($\${total} USD requiere verificación 3D Secure)\`);
      }
      if (attempts >= 3) {
        score += 35;
        flags.push(\`ALTA_VELOCIDAD_TRANSACCIONAL (\${attempts} intentos en 24h)\`);
      }
      if (/@(tempmail|10minutemail|throwaway|disposable|mailinator)\\./i.test(email)) {
        score += 50;
        flags.push(\`CORREO_TEMPORAL_DETECTADO (\${email})\`);
      }
  
      const decision = score >= 70 ? 'BLOQUEADO' : score >= 40 ? 'REVISION_MANUAL' : 'APROBADO';
  
      res.json({
        exito: true,
        autorizado: decision === 'APROBADO',
        decision,
        riskScore: score,
        flags,
        reservaId: data.idReserva || data.id || 'CRT-TEST-FRAUD',
        recomendacion: decision === 'APROBADO' 
          ? 'Transacción legítima. Proceder con emisión de voucher digital.'
          : decision === 'REVISION_MANUAL'
          ? 'Solicitar verificación 3D Secure o confirmación telefónica al titular.'
          : 'Bloquear transacción y reportar intento sospechoso en pasarela.',
        mensaje: 'Evaluación antifraude (Fallback Heurístico) completada.'
      });
    }`;

content = content.replace(targetContent, newContent);
fs.writeFileSync('server.ts', content);
