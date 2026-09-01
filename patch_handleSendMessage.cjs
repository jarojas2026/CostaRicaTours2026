const fs = require('fs');
let content = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

const regex = /const procRes = await fetch\('\/api\/agents\/processor', \{[\s\S]*?const newHistory = \[\.\.\.prev, \{ role: 'bot' as const, text: replyText \}\];\s*return newHistory\.slice\(-50\);\s*\}\);/m;

const replacement = `const procRes = await fetch('/api/agents/processor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawMessage: msg, intent: triageData.intent, extractedData: triageData.extractedData })
        });
        const procData = await procRes.json();

        // SIMULATION LOGIC FOR PROGRESS INDICATOR
        if (msg.toLowerCase().includes('reserv') || msg.toLowerCase().includes('book')) {
           setBookingStatus('pending');
           setTimeout(() => {
             setBookingStatus('payment_required');
             setChatHistory(prev => {
                const newHistory = [...prev, { role: 'bot' as const, text: language === 'es' ? '🔗 Aquí tienes tu enlace de pago seguro para confirmar el cupo. Expira en 15 minutos.' : '🔗 Here is your secure payment link to confirm the spot. It expires in 15 minutes.' }];
                return newHistory.slice(-50);
             });
           }, 5000);
        } else if ((msg.toLowerCase().includes('pag') || msg.toLowerCase().includes('paid') || msg.toLowerCase().includes('listo')) && bookingStatus === 'payment_required') {
           setBookingStatus('confirmed');
        }

        setChatHistory(prev => {
          let replyText = procData.draftResponse || (language === 'es' ? 'Mensaje procesado en backend.' : 'Message processed in backend.');
          
          if (bookingStatus === 'payment_required' && (msg.toLowerCase().includes('pag') || msg.toLowerCase().includes('paid') || msg.toLowerCase().includes('listo'))) {
             replyText = language === 'es' ? '✅ ¡Pago recibido! Tu reserva está 100% confirmada. Te hemos enviado el voucher por correo.' : '✅ Payment received! Your booking is 100% confirmed. We sent the voucher to your email.';
          }

          const newHistory = [...prev, { role: 'bot' as const, text: replyText }];
          return newHistory.slice(-50);
        });`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', content);
