/**
 * Counter Digital & Counter Agent — Embeddable Widget
 * Costa Rica Tours 2026
 *
 * Modo de uso:
 * <script 
 *   src="https://tudominio.com/counter-widget.js" 
 *   data-endpoint="https://tudominio.com/api/agent/counter"
 *   data-lang="es"
 *   data-color="#059669">
 * </script>
 */
(function () {
  if (window.__COUNTER_DIGITAL_INITIALIZED__) return;
  window.__COUNTER_DIGITAL_INITIALIZED__ = true;

  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const API_ENDPOINT = currentScript?.getAttribute('data-endpoint') || '/api/agent/counter';
  const PRIMARY_COLOR = currentScript?.getAttribute('data-color') || '#059669';
  let CURRENT_LANG = currentScript?.getAttribute('data-lang') || 'es';

  // Inject CSS Styles
  const style = document.createElement('style');
  style.id = 'counter-digital-styles';
  style.innerHTML = `
    #crt-counter-widget-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    #crt-counter-widget-root * {
      box-sizing: border-box;
    }
    .crt-bubble-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #047857, #065f46);
      border: 2px solid #10b981;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3), 0 0 15px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      font-size: 28px;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    }
    .crt-bubble-btn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 14px 28px rgba(0,0,0,0.35), 0 0 20px rgba(16, 185, 129, 0.6);
    }
    .crt-badge-pulse {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      background: #f59e0b;
      border-radius: 50%;
      border: 2px solid #064e3b;
      animation: crt-pulse 2s infinite;
    }
    @keyframes crt-pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
    }
    .crt-chat-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 400px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 120px);
      background: #061e14;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 25px rgba(4, 120, 87, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .crt-chat-window.crt-active {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    .crt-header {
      background: linear-gradient(135deg, #064e3b, #022c22);
      border-bottom: 1px solid rgba(16, 185, 129, 0.2);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #fff;
    }
    .crt-header-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .crt-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #047857;
      border: 2px solid #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .crt-title {
      font-size: 15px;
      font-weight: 700;
      color: #ecfdf5;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .crt-subtitle {
      font-size: 11px;
      color: #a7f3d0;
      margin: 0;
    }
    .crt-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .crt-btn-icon {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #ecfdf5;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .crt-btn-icon:hover {
      background: rgba(255,255,255,0.2);
    }
    .crt-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: radial-gradient(circle at top right, #06281b, #03140d);
    }
    .crt-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
    }
    .crt-msg-user {
      align-self: flex-end;
      background: #047857;
      color: #fff;
      border-bottom-right-radius: 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .crt-msg-agent {
      align-self: flex-start;
      background: rgba(16, 185, 129, 0.12);
      color: #ecfdf5;
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-bottom-left-radius: 3px;
    }
    .crt-msg-agent strong {
      color: #34d399;
    }
    .crt-quick-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .crt-pill {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 600;
      border-radius: 12px;
      padding: 4px 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .crt-pill:hover {
      background: rgba(245, 158, 11, 0.3);
      border-color: #f59e0b;
    }
    .crt-voucher-card {
      background: #064e3b;
      border: 1px dashed #34d399;
      border-radius: 10px;
      padding: 12px;
      margin-top: 8px;
      color: #ecfdf5;
      font-size: 12px;
    }
    .crt-input-bar {
      padding: 12px;
      background: #041c13;
      border-top: 1px solid rgba(16, 185, 129, 0.2);
      display: flex;
      gap: 8px;
    }
    .crt-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 10px;
      padding: 10px 14px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: border 0.2s;
    }
    .crt-input:focus {
      border-color: #10b981;
      background: rgba(255,255,255,0.09);
    }
    .crt-send-btn {
      background: #059669;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 0 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .crt-send-btn:hover {
      background: #10b981;
    }
  `;
  document.head.appendChild(style);

  // Widget Container
  const root = document.createElement('div');
  root.id = 'crt-counter-widget-root';

  const welcomeText = CURRENT_LANG === 'en'
    ? "¡Pura Vida! I'm Sofía from Costa Rica Tours Front Desk. How can I help you book or plan your trip today?"
    : "¡Pura Vida! Soy Sofía, del Mostrador Oficial de Costa Rica Tours. ¿Qué tour, traslado o paquete deseas cotizar o reservar hoy?";

  root.innerHTML = `
    <div class="crt-chat-window" id="crt-chat-window">
      <div class="crt-header">
        <div class="crt-header-info">
          <div class="crt-avatar">🛎️</div>
          <div>
            <h4 class="crt-title">Sofía • Counter Agent <span style="font-size: 10px; background: #059669; padding: 2px 6px; border-radius: 10px; color: #fff;">24/7</span></h4>
            <p class="crt-subtitle">Mostrador Digital • Costa Rica Tours</p>
          </div>
        </div>
        <div class="crt-actions">
          <button class="crt-btn-icon" id="crt-lang-toggle">${CURRENT_LANG.toUpperCase()}</button>
          <button class="crt-btn-icon" id="crt-close-btn">✕</button>
        </div>
      </div>
      <div class="crt-messages" id="crt-messages">
        <div class="crt-msg crt-msg-agent">
          ${welcomeText}
          <div class="crt-quick-pills">
            <span class="crt-pill" data-msg="${CURRENT_LANG === 'en' ? 'I want to make an instant booking' : 'Quiero hacer una reserva inmediata'}">📅 ${CURRENT_LANG === 'en' ? 'Instant Booking' : 'Reserva Inmediata'}</span>
            <span class="crt-pill" data-msg="${CURRENT_LANG === 'en' ? 'Check my existing reservation' : 'Consultar mi reserva existente'}">🔍 ${CURRENT_LANG === 'en' ? 'Find Booking' : 'Consultar Reserva'}</span>
            <span class="crt-pill" data-msg="${CURRENT_LANG === 'en' ? 'Top tours in Arenal and Manuel Antonio' : 'Mejores tours en Arenal y Manuel Antonio'}">🌋 ${CURRENT_LANG === 'en' ? 'Top Tours' : 'Mejores Tours'}</span>
          </div>
        </div>
      </div>
      <form class="crt-input-bar" id="crt-form">
        <input type="text" class="crt-input" id="crt-input" placeholder="${CURRENT_LANG === 'en' ? 'Ask Sofía or type details to book...' : 'Escribe a Sofía o indica datos para reservar...'}" autocomplete="off" />
        <button type="submit" class="crt-send-btn" id="crt-send-btn">➤</button>
      </form>
    </div>
    <div class="crt-bubble-btn" id="crt-bubble-btn" title="Mostrador Digital Costa Rica">
      🛎️
      <div class="crt-badge-pulse"></div>
    </div>
  `;

  document.body.appendChild(root);

  // References
  const bubbleBtn = document.getElementById('crt-bubble-btn');
  const chatWindow = document.getElementById('crt-chat-window');
  const closeBtn = document.getElementById('crt-close-btn');
  const langToggle = document.getElementById('crt-lang-toggle');
  const form = document.getElementById('crt-form');
  const input = document.getElementById('crt-input');
  const messagesContainer = document.getElementById('crt-messages');

  let chatHistory = [];

  // Toggle open
  bubbleBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('crt-active');
    if (chatWindow.classList.contains('crt-active')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chatWindow.classList.remove('crt-active');
  });

  langToggle.addEventListener('click', () => {
    CURRENT_LANG = CURRENT_LANG === 'es' ? 'en' : 'es';
    langToggle.innerText = CURRENT_LANG.toUpperCase();
    input.placeholder = CURRENT_LANG === 'en' ? 'Ask Sofía or type details to book...' : 'Escribe a Sofía o indica datos para reservar...';
  });

  // Quick pills listener
  messagesContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.crt-pill');
    if (pill) {
      const msg = pill.getAttribute('data-msg');
      if (msg) {
        sendMessage(msg);
      }
    }
  });

  // Submit message
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    sendMessage(val);
    input.value = '';
  });

  function appendMessage(text, role, voucher, quickActions) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `crt-msg ${role === 'user' ? 'crt-msg-user' : 'crt-msg-agent'}`;

    // Simple markdown formatting
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');

    msgDiv.innerHTML = formatted;

    if (voucher) {
      const vDiv = document.createElement('div');
      vDiv.className = 'crt-voucher-card';
      vDiv.innerHTML = `
        <div style="font-weight: 700; color: #34d399; margin-bottom: 4px;">🎟️ VOUCHER OFICIAL #${voucher.bookingId || 'CRT-CONFIRM'}</div>
        <div><strong>Excursión:</strong> ${voucher.tourName || 'Tour Costa Rica'}</div>
        <div><strong>Fecha:</strong> ${voucher.date || 'Confirmada'}</div>
        <div><strong>Pasajeros:</strong> ${voucher.adults || 1} adultos</div>
        <div style="margin-top: 6px; font-weight: 800; color: #fbbf24;">Total: $${voucher.totalUSD || 0} USD</div>
      `;
      msgDiv.appendChild(vDiv);
    }

    if (quickActions && quickActions.length > 0) {
      const pillsDiv = document.createElement('div');
      pillsDiv.className = 'crt-quick-pills';
      quickActions.forEach(qa => {
        const p = document.createElement('span');
        p.className = 'crt-pill';
        p.innerText = qa.label;
        p.setAttribute('data-msg', qa.data?.message || qa.label);
        pillsDiv.appendChild(p);
      });
      msgDiv.appendChild(pillsDiv);
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage(text) {
    appendMessage(text, 'user');
    chatHistory.push({ role: 'user', text });

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'crt-msg crt-msg-agent';
    typing.id = 'crt-typing';
    typing.innerHTML = '<em>Sofía está consultando disponibilidad...</em>';
    messagesContainer.appendChild(typing);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: CURRENT_LANG,
          history: chatHistory.slice(-6)
        })
      });

      const typingEl = document.getElementById('crt-typing');
      if (typingEl) typingEl.remove();

      if (!res.ok) {
        throw new Error('Error al conectar con el mostrador');
      }

      const data = await res.json();
      const reply = data.reply || '¡Pura Vida! He recibido tu consulta.';
      appendMessage(reply, 'agent', data.voucherPreview || data.voucher, data.quickActions);
      chatHistory.push({ role: 'assistant', text: reply });

    } catch (err) {
      const typingEl = document.getElementById('crt-typing');
      if (typingEl) typingEl.remove();
      appendMessage('Disculpa, tuvimos un breve desfase de conexión con la central. Puedes escribirnos directo a WhatsApp (+506 8795-9148).', 'agent');
    }
  }
})();
