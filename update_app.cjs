const fs = require('fs');

let appFile = fs.readFileSync('src/App.tsx', 'utf8');

// Add the useEffect to parse booking=success from URL
const hookRegex = /const \[isAdminDashboardOpen, setIsAdminDashboardOpen\] = useState\(false\);/;

if (appFile.match(hookRegex)) {
  const newHook = `const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Check URL parameters for successful payment redirect (Stripe/PayPal)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('booking') === 'success') {
      const sessionId = params.get('session_id');
      // We simulate fetching the confirmed booking or we just show a success modal
      setRecentBooking({
        bookingId: "VERIFICANDO...",
        tourId: "procesando",
        tourName: "Tu Experiencia en Costa Rica",
        date: "Confirmando fecha...",
        time: "Confirmando hora...",
        adults: 1,
        children: 0,
        pickupHotel: "",
        specialRequests: "",
        totalUSD: 0,
        totalCRC: 0,
        paymentMethod: "credit_card",
        paymentStatus: "completed",
        status: "confirmada",
        createdAt: new Date().toISOString()
      });

      if (sessionId) {
        // Here we could fetch the specific booking by stripe session ID if we had a dedicated endpoint
        // For now, we clear the URL to avoid re-triggering
      }

      // Cleanup URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('booking') === 'canceled') {
      alert(language === 'es' ? 'El pago fue cancelado. Puedes volver a intentarlo cuando gustes.' : 'Payment was canceled. You can try again whenever you are ready.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [language]);`;

  appFile = appFile.replace(hookRegex, newHook);
  fs.writeFileSync('src/App.tsx', appFile);
  console.log("Updated App.tsx with URL parameter detection.");
} else {
  console.log("Could not find insertion point.");
}
