const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldCode = `  // Verificación Server-Side de Pagos (PayPal)
  let finalStatus = status || "confirmada";
  let finalPaymentStatus = paymentStatus || "completed";

  if (paymentMethod === "paypal") {
    finalStatus = "pendiente_pago";
    finalPaymentStatus = "pending";

    if (paypalOrderId) {
      try {
        const paypalClientId = process.env.PAYPAL_CLIENT_ID;
        const paypalSecret = process.env.PAYPAL_SECRET;
        
        if (paypalClientId && paypalSecret) {
          const authStr = Buffer.from(\`\${paypalClientId}:\${paypalSecret}\`).toString('base64');
          const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
              'Authorization': \`Basic \${authStr}\`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          const authData = await authRes.json();
          
          if (authData.access_token) {
            const orderRes = await fetch(\`https://api-m.sandbox.paypal.com/v2/checkout/orders/\${paypalOrderId}\`, {
              headers: { 'Authorization': \`Bearer \${authData.access_token}\` }
            });
            const orderData = await orderRes.json();
            
            if (orderData.status === 'COMPLETED') {
              finalStatus = "confirmada";
              finalPaymentStatus = "completed";
            }
          }
        } else {
          console.warn("PAYPAL_CLIENT_ID or PAYPAL_SECRET not configured, unable to verify PayPal payment.");
        }
      } catch (err) {
        console.error("Error verifying PayPal order:", err);
      }
    }
  }

  // Disparar Webhook a n8n si el pago de PayPal se confirmó en backend
  if (finalStatus === "confirmada" && paymentMethod === "paypal") {
    const N8N_URL = process.env.N8N_BOOKING_WEBHOOK_URL || "https://costaricatours.app.n8n.cloud/webhook-test/mi-api";
    if (N8N_URL) {
      // Usamos setImmediate o un fetch no bloqueante para no demorar la respuesta al cliente
      fetch(N8N_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          tourId,
          tourName,
          date,
          time: bookingTime,
          adults: numAdults,
          children: numChildren,
          customerName: customer?.name,
          customerEmail: customer?.email,
          paymentMethod,
          paymentStatus: finalPaymentStatus,
          status: finalStatus,
          agentInsights
        })
      }).catch(err => console.error("Error notificando a n8n para PayPal:", err));
    }
  }`;

const newCode = `  // Verificación Server-Side de Pagos (PayPal & Stripe)
  let finalStatus = "pendiente_pago";
  let finalPaymentStatus = "pending";

  if (paymentMethod === "paypal" && paypalOrderId) {
    try {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      const paypalMode = process.env.PAYPAL_MODE || "sandbox";
      const paypalBaseUrl = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      
      if (paypalClientId && paypalSecret) {
        const authStr = Buffer.from(\`\${paypalClientId}:\${paypalSecret}\`).toString('base64');
        const authRes = await fetch(\`\${paypalBaseUrl}/v1/oauth2/token\`, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers: {
            'Authorization': \`Basic \${authStr}\`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        const authData = await authRes.json();
        
        if (authData.access_token) {
          const orderRes = await fetch(\`\${paypalBaseUrl}/v2/checkout/orders/\${paypalOrderId}\`, {
            headers: { 'Authorization': \`Bearer \${authData.access_token}\` }
          });
          const orderData = await orderRes.json();
          
          if (orderData.status === 'COMPLETED') {
            finalStatus = "confirmada";
            finalPaymentStatus = "completed";
          }
        }
      } else {
        console.warn("PAYPAL_CLIENT_ID or PAYPAL_SECRET not configured, unable to verify PayPal payment.");
      }
    } catch (err) {
      console.error("Error verifying PayPal order:", err);
    }
  } else if ((paymentMethod === "stripe" || req.body.stripeSessionId) && req.body.stripeSessionId) {
    try {
      const stripe = getStripe();
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(req.body.stripeSessionId);
        if (session.payment_status === "paid") {
          finalStatus = "confirmada";
          finalPaymentStatus = "completed";
        }
      } else {
        console.warn("STRIPE_SECRET_KEY not configured, unable to verify Stripe payment.");
      }
    } catch (err) {
      console.error("Error verifying Stripe session:", err);
    }
  }`;

if (content.includes('// Verificación Server-Side de Pagos (PayPal)')) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('server.ts', content);
  console.log('Payment verification updated successfully.');
} else {
  console.error('Could not find old code block in server.ts');
}
