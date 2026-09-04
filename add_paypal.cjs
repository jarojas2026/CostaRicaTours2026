const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const stripeRegex = /app\.post\("\/api\/stripe\/create-checkout-session", async \(req, res\) => \{[\s\S]*?\n\}\);/m;

const paypalEndpoint = `
// PayPal Order Generation (Server-Side)
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || "sandbox";
    const baseUrl = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    if (!paypalClientId || !paypalSecret) {
      return res.status(500).json({ error: "PayPal no está configurado en el servidor." });
    }

    const authStr = Buffer.from(\`\${paypalClientId}:\${paypalSecret}\`).toString('base64');
    const authRes = await fetch(\`\${baseUrl}/v1/oauth2/token\`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        'Authorization': \`Basic \${authStr}\`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const authData = await authRes.json();

    if (!authData.access_token) {
      return res.status(500).json({ error: "Error de autenticación con PayPal" });
    }

    const { totalUSD, tourName } = req.body;
    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';

    const orderRes = await fetch(\`\${baseUrl}/v2/checkout/orders\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${authData.access_token}\`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: tourName,
            amount: {
              currency_code: "USD",
              value: totalUSD.toString()
            }
          }
        ],
        application_context: {
          brand_name: "Costa Rica Tours",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: \`\${origin}/?booking=success&method=paypal\`,
          cancel_url: \`\${origin}/?booking=canceled\`
        }
      })
    });
    const orderData = await orderRes.json();
    
    if (orderData.id) {
      const approveLink = orderData.links.find((link) => link.rel === "approve");
      if (approveLink) {
        return res.json({ id: orderData.id, url: approveLink.href });
      }
    }
    return res.status(500).json({ error: "Error creando orden de PayPal" });
  } catch (error) {
    console.error("PayPal Order Error:", error);
    res.status(500).json({ error: "Error al comunicarse con PayPal" });
  }
});
`;

if (server.match(stripeRegex)) {
  server = server.replace(stripeRegex, (match) => match + "\n\n" + paypalEndpoint);
  fs.writeFileSync('server.ts', server);
  console.log("Added PayPal endpoint.");
} else {
  console.log("Could not find Stripe endpoint to inject PayPal logic.");
}
