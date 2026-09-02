import React, { useState, useEffect } from 'react';
import { BookingRequest, Language, Currency } from '../types';
import { 
  CheckCircle2, Printer, Share2, ShieldCheck, Phone, Calendar, Clock, 
  MapPin, Users, Hotel, X, Loader2, ListTodo, CreditCard, Smartphone, Banknote, Check 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getAccessToken, signInWithGoogle } from '../firebase';
import QRCode from 'qrcode';

interface BookingConfirmationModalProps {
  booking: BookingRequest | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  booking,
  isOpen = true,
  onClose,
  language,
  currency
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (booking) {
      const generateQR = async () => {
        try {
          const url = `${window.location.origin}/?bookingId=${booking.bookingId}`;
          const qrDataUrl = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            margin: 1,
            color: {
              dark: '#1E4D2B',
              light: '#ffffff'
            }
          });
          setQrCodeUrl(qrDataUrl);
        } catch (err) {
          console.error(err);
        }
      };
      generateQR();
    }
  }, [booking]);

  if (!booking || isOpen === false) return null;

  // Format payment method text
  const getPaymentBadge = () => {
    switch (booking.paymentMethod) {
      case 'credit_card':
        return {
          icon: <CreditCard className="w-3.5 h-3.5" />,
          label: language === 'es' ? 'Tarjeta de Crédito / Débito' : 'Credit / Debit Card',
          status: language === 'es' ? 'Pagado (Confirmado)' : 'Paid (Confirmed)',
          color: 'bg-stone-100 text-stone-900 border-teal-300'
        };
      case 'sinpe_movil':
        return {
          icon: <Smartphone className="w-3.5 h-3.5" />,
          label: 'SINPE Móvil (+506 8795-9148)',
          status: booking.paymentStatus === 'completed' 
            ? (language === 'es' ? 'Liquidado' : 'Settled') 
            : (language === 'es' ? 'Pendiente de Comprobante' : 'Receipt Pending'),
          color: 'bg-[#EBF3ED] text-[#1E4D2B] border-[#BCD4C2]'
        };
      case 'pay_at_pickup':
        return {
          icon: <Banknote className="w-3.5 h-3.5" />,
          label: language === 'es' ? 'Pago al Abordar (Efectivo/Tarjeta)' : 'Pay at Pickup (Cash/Card)',
          status: language === 'es' ? 'Garantizado ($0 ahora)' : 'Guaranteed ($0 now)',
          color: 'bg-amber-100 text-amber-900 border-orange-300'
        };
      case 'paypal':
        return {
          icon: <CreditCard className="w-3.5 h-3.5" />,
          label: 'PayPal Express',
          status: language === 'es' ? 'Pagado (Protección PayPal)' : 'Paid (PayPal Protected)',
          color: 'bg-blue-100 text-blue-900 border-blue-300'
        };
      default:
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          label: language === 'es' ? 'Confirmado' : 'Confirmed',
          status: language === 'es' ? 'Garantizado' : 'Guaranteed',
          color: 'bg-stone-100 text-stone-900 border-teal-300'
        };
    }
  };

  const paymentBadge = getPaymentBadge();

  const handleAddToTasks = async () => {
    setIsAddingTask(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await signInWithGoogle();
        if (result) {
          token = result.accessToken;
        } else {
          return;
        }
      }

      const dueDate = new Date(booking.date);
      const dueString = dueDate.toISOString();
      const voucherLink = `${window.location.origin}/?bookingId=${booking.bookingId}`;

      const taskDetails = {
        title: `Tour Costa Rica: ${booking.tourName}`,
        notes: `ID: ${booking.bookingId}\nFecha: ${booking.date} a las ${booking.time}\nPickup: ${booking.pickupHotel}\nPasajeros: ${booking.adults} Adultos${booking.children > 0 ? `, ${booking.children} Niños` : ''}\nTotal: $${booking.totalUSD} USD (₡${booking.totalCRC.toLocaleString()} CRC)\nMétodo: ${paymentBadge.label}\n\nVoucher: ${voucherLink}`,
        due: dueString
      };

      const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskDetails)
      });

      if (response.ok) {
        alert(language === 'es' ? '¡Recordatorio añadido con éxito a Google Tasks!' : 'Reminder added to Google Tasks!');
      } else {
        throw new Error('Failed to add task');
      }
    } catch (error) {
      console.error('Error adding to tasks:', error);
      alert(language === 'es' ? 'Error al sincronizar con Google Tasks.' : 'Error adding reminder.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handlePrint = async () => {
    const element = document.getElementById('pdf-voucher-content');
    if (!element) {
      window.print();
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      element.style.position = 'absolute';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-1';
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FAF8F5'
      });
      
      element.style.left = '-9999px';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let imgWidth = pageWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        imgHeight = pageHeight;
        imgWidth = imgWidth * ratio;
      }
      
      const x = (pageWidth - imgWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);
      pdf.save(`CostaRicaTours_Voucher_${booking.bookingId}.pdf`);
    } catch (error) {
      console.error('PDF generation error', error);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
      if (element) element.style.left = '-9999px';
    }
  };

  const whatsappMsg = encodeURIComponent(
    `🇨🇷 *Voucher Oficial Costa Rica Tours (costaricatours.es)*\n` +
    `*ID de Reserva:* ${booking.bookingId}\n` +
    `*Tour:* ${booking.tourName}\n` +
    `*Fecha:* ${booking.date} | *Hora:* ${booking.time}\n` +
    `*Pasajeros:* ${booking.adults} Adultos${booking.children > 0 ? `, ${booking.children} Niños` : ''}\n` +
    `*Hotel Pickup:* ${booking.pickupHotel}\n` +
    `*Titular:* ${booking.customer.fullName} (${booking.customer.phone})\n` +
    `*Total:* $${booking.totalUSD} USD (₡${booking.totalCRC.toLocaleString()} CRC)\n` +
    `*Estado de Pago:* ${paymentBadge.status} (${paymentBadge.label})\n\n` +
    `_Por favor confirmar recibo de la orden y datos del chofer._`
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1A10]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* --- HIDDEN PROFESSIONAL PRINTABLE VOUCHER --- */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
        <div id="pdf-voucher-content" style={{ width: '800px', padding: '50px', backgroundColor: '#FAF8F5', color: '#1C1917', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ borderBottom: '3px solid #1E4D2B', paddingBottom: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: '#1E4D2B', fontSize: '30px', margin: 0, fontWeight: '900', letterSpacing: '-0.5px' }}>COSTA RICA TOURS</h2>
              <p style={{ margin: '4px 0 0 0', color: '#57534E', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {language === 'es' ? 'Voucher Oficial • costaricatours.es • Pura Vida' : 'Official Voucher • costaricatours.es • Pura Vida'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ backgroundColor: '#E8F0EA', border: '1px solid #BCD4C2', padding: '8px 16px', borderRadius: '8px', display: 'inline-block' }}>
                <h2 style={{ fontSize: '16px', margin: 0, color: '#1E4D2B', fontWeight: '800' }}>{language === 'es' ? 'Código:' : 'Booking ID:'} {booking.bookingId}</h2>
                <p style={{ margin: '2px 0 0 0', color: '#15803D', fontSize: '11px', fontWeight: 'bold' }}>✓ CONFIRMADO / GARANTIZADO</p>
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '18px', margin: '0 0 14px 0', color: '#1E4D2B', fontWeight: '800', textTransform: 'uppercase' }}>
              {language === 'es' ? 'Detalles del Servicio' : 'Service Details'}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', width: '30%', color: '#57534E' }}>{language === 'es' ? 'Tour' : 'Tour Name'}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1C1917' }}>{booking.tourName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', color: '#57534E' }}>{language === 'es' ? 'Fecha y Hora' : 'Date & Time'}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1C1917' }}>{booking.date} {language === 'es' ? 'a las' : 'at'} {booking.time}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', color: '#57534E' }}>{language === 'es' ? 'Pasajeros' : 'Passengers'}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1C1917' }}>{booking.adults} {language === 'es' ? 'Adultos' : 'Adults'} {booking.children > 0 && `, ${booking.children} ${language === 'es' ? 'Niños' : 'Children'}`}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', color: '#57534E' }}>{language === 'es' ? 'Lugar de Recogida' : 'Pickup Location'}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1C1917' }}>{booking.pickupHotel}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', margin: '0 0 14px 0', color: '#1E4D2B', fontWeight: '800', textTransform: 'uppercase' }}>
              {language === 'es' ? 'Información del Cliente y Pago' : 'Customer & Payment Info'}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <table style={{ width: '70%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', width: '40%', color: '#57534E' }}>{language === 'es' ? 'Titular' : 'Customer Name'}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1C1917' }}>{booking.customer.fullName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', color: '#57534E' }}>{language === 'es' ? 'Teléfono / WhatsApp' : 'Phone'}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1C1917' }}>{booking.customer.phone}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', color: '#57534E' }}>{language === 'es' ? 'Método de Pago' : 'Payment Method'}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '600', color: '#1E4D2B' }}>{paymentBadge.label} ({paymentBadge.status})</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '700', color: '#57534E' }}>{language === 'es' ? 'Total Liquidado' : 'Total Amount'}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #E7E5E4', fontWeight: '800', fontSize: '16px', color: '#1E4D2B' }}>${booking.totalUSD} USD <span style={{ fontSize: '12px', color: '#78716C', fontWeight: 'normal' }}>(₡{booking.totalCRC.toLocaleString()} CRC)</span></td>
                  </tr>
                </tbody>
              </table>
              {qrCodeUrl && (
                <div style={{ width: '25%', textAlign: 'center' }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', height: 'auto', border: '2px solid #E7E5E4', borderRadius: '8px' }} />
                  <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#57534E' }}>{language === 'es' ? 'Escanea para Check-in' : 'Scan for Check-in'}</p>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#F5EEDC', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #1E4D2B' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#1E4D2B', fontSize: '15px', fontWeight: '800' }}>💡 {language === 'es' ? 'Instrucciones de Recogida (Pickup)' : 'Pickup Instructions'}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#44403C', lineHeight: '1.6' }}>
              {language === 'es'
                ? 'El chofer o guía del servicio asociado se presentará en la recepción/lobby de tu hotel 15 minutos antes de la hora indicada y preguntará por el nombre del titular de la reserva. Por favor, presenta este voucher digital o impreso al momento de abordar.'
                : 'Your assigned local driver or tour guide will arrive at your hotel lobby 15 minutes before departure time and will ask for the lead traveler\'s name. Please present this digital or printed voucher when boarding.'}
            </p>
          </div>
          
          <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px', color: '#78716C', borderTop: '1px solid #E7E5E4', paddingTop: '20px' }}>
            <p style={{ margin: '0 0 4px 0' }}>{language === 'es' ? '¡Gracias por elegir Costa Rica Tours (costaricatours.es)! Dudas o emergencias vía WhatsApp al +506 8795-9148. Pura Vida!' : 'Thank you for choosing Costa Rica Tours (costaricatours.es)! WhatsApp support: +506 8795-9148. Pura Vida!'}</p>
            <p style={{ margin: 0 }}>{language === 'es' ? 'Generado el' : 'Generated on'} {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
      {/* --- END HIDDEN PDF VOUCHER --- */}

      <div className="bg-[#102A1C] text-stone-100 border border-[#2D663B]/40 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-10 h-10 bg-[#0C1E14]/90 hover:bg-[#1E4D2B] text-stone-200 rounded-full flex items-center justify-center border border-[#2D663B]/60 transition-colors shadow-lg cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-5 sm:p-7 custom-scrollbar w-full flex-1 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2 pb-4 border-b border-[#2D663B]/40">
            <div className="w-14 h-14 bg-gradient-to-tr from-[#1E4D2B] to-[#488257] rounded-full mx-auto flex items-center justify-center text-orange-300 border-2 border-orange-300/40 shadow-lg animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-orange-300 block">
              {language === 'es' ? '¡Reserva Confirmada y Garantizada!' : 'Booking Confirmed & Guaranteed!'}
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              {language === 'es' ? 'Voucher de Servicio Turístico' : 'Tourist Service Voucher'}
            </h2>

            <div className="inline-block bg-[#0C1E14]/90 text-[#F5EEDC] px-4 py-1 rounded-full font-mono font-bold text-xs border border-[#2D663B]/60">
              Código: <span className="text-orange-300">{booking.bookingId}</span>
            </div>
          </div>

          {/* Tour Details Box */}
          <div className="bg-[#0C1E14]/70 p-4 sm:p-5 rounded-2xl border border-[#2D663B]/50 space-y-3">
            <h3 className="text-sm font-black text-white uppercase border-b border-[#2D663B]/40 pb-2">
              {booking.tourName}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                <span><strong className="text-stone-400">{language === 'es' ? 'Fecha:' : 'Date:'}</strong> {booking.date}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                <span><strong className="text-stone-400">{language === 'es' ? 'Horario:' : 'Time:'}</strong> {booking.time}</span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400 shrink-0" />
                <span>
                  <strong className="text-stone-400">{language === 'es' ? 'Pasajeros:' : 'Travelers:'}</strong> {booking.adults} {language === 'es' ? 'Adultos' : 'Adults'}
                  {booking.children > 0 && `, ${booking.children} ${language === 'es' ? 'Niños' : 'Kids'}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Hotel className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="line-clamp-1">
                  <strong className="text-stone-400">Pickup:</strong> {booking.pickupHotel}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Client Summary Box with QR */}
          <div className="bg-[#FAF8F5] text-stone-900 p-4 sm:p-5 rounded-2xl border border-[#2D663B] flex flex-col sm:flex-row gap-4 items-center justify-between shadow-md">
            <div className="w-full space-y-2 flex-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">{language === 'es' ? 'Titular:' : 'Lead Traveler:'}</span>
                <span className="text-stone-900 font-black">{booking.customer.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">Email:</span>
                <span className="text-stone-800 font-medium">{booking.customer.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">{language === 'es' ? 'Método de Pago:' : 'Payment Method:'}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${paymentBadge.color}`}>
                  {paymentBadge.icon}
                  <span>{paymentBadge.label}</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-stone-200 pt-2 mt-2">
                <span className="text-stone-700 font-bold">{language === 'es' ? 'Total Liquidado / Por Liquidar:' : 'Total Amount:'}</span>
                <span className="text-[#1E4D2B] text-base font-black">
                  ${booking.totalUSD} USD <span className="text-xs font-normal text-stone-500">(₡{booking.totalCRC.toLocaleString()} CRC)</span>
                </span>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="bg-white p-2 rounded-xl border border-stone-300 shrink-0 shadow-xs text-center">
                <img src={qrCodeUrl} alt="QR Check-in" className="w-20 h-20 object-contain mx-auto" />
                <p className="text-[9px] text-stone-700 font-black mt-1 uppercase">{language === 'es' ? 'Check-in QR' : 'Check-in QR'}</p>
              </div>
            )}
          </div>
          
          {/* AI Agent Operational Insights (Internal View/Simulation) */}
          {booking.agentInsights && (
            <div className="bg-[#0f172a] p-3.5 rounded-xl border border-indigo-500/40 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 block uppercase text-[10px] flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  AI Automation Engine: Processed
                </span>
                <span className="bg-indigo-900/50 text-indigo-200 px-1.5 py-0.5 rounded text-[9px] border border-indigo-700/50 uppercase">Internal</span>
              </div>
              <p className="text-indigo-200/90 text-[10px] leading-relaxed italic border-l-2 border-indigo-500/50 pl-2">
                "{booking.agentInsights.riskAssessment}"
              </p>
              
              <div className="flex flex-wrap gap-1 pt-1">
                {booking.agentInsights.automatedTags.map((tag, idx) => (
                  <span key={idx} className="bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-indigo-500/30">
                    #{tag}
                  </span>
                ))}
              </div>

              {booking.agentInsights.operationalInstructions.length > 0 && (
                <div className="pt-1.5">
                  <p className="text-indigo-300 text-[10px] font-bold mb-1 uppercase">Automated Staff Tasks:</p>
                  <ul className="list-disc pl-4 text-indigo-200/80 text-[10px] space-y-0.5">
                    {booking.agentInsights.operationalInstructions.map((inst, idx) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Invoice Note */}
          {booking.electronicInvoice?.wantsInvoice && (
            <div className="bg-[#0C1E14]/60 p-3.5 rounded-xl border border-[#2D663B]/40 text-xs space-y-1">
              <span className="font-bold text-[#A8D5BA] block uppercase text-[11px]">
                🧾 {language === 'es' ? 'Factura Electrónica Hacienda' : 'Costa Rica Tax Invoice'}
              </span>
              <p className="text-stone-300 text-[11px]">
                {language === 'es' 
                  ? `Se emitirá la factura fiscal a nombre de: ${booking.electronicInvoice.legalName} (${booking.electronicInvoice.idNumber}).`
                  : `Tax invoice will be generated for: ${booking.electronicInvoice.legalName} (${booking.electronicInvoice.idNumber}).`}
              </p>
            </div>
          )}

          {/* Arrival Instructions */}
          <div className="bg-[#173D26] p-3.5 rounded-xl border border-[#2D663B] text-xs text-stone-200 space-y-1">
            <span className="font-bold text-orange-300 block uppercase text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {language === 'es' ? 'Instrucciones de Recogida (Pickup):' : 'Pickup Instructions:'}
            </span>
            <p className="text-stone-300 text-[11px] leading-relaxed">
              {language === 'es'
                ? 'El chofer o guía del servicio asociado se presentará en la recepción/lobby de tu hotel 15 minutos antes de la hora indicada preguntando por el titular de la reserva. Presenta este código QR o voucher al abordar.'
                : 'Your assigned driver or tour guide will meet you at your hotel lobby 15 minutes before the departure time and ask for the lead traveler\'s name. Present this QR code or voucher upon boarding.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#2D663B]/40 flex flex-col gap-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handlePrint}
                disabled={isGeneratingPDF}
                className="bg-[#1E4D2B] hover:bg-[#14391F] disabled:opacity-70 text-[#FAF8F5] border border-[#3E6D4B] font-bold text-xs uppercase py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-300" />
                ) : (
                  <Printer className="w-4 h-4 text-orange-300" />
                )}
                <span>{isGeneratingPDF ? (language === 'es' ? 'Generando...' : 'Generating...') : (language === 'es' ? 'Descargar Voucher PDF' : 'Download PDF Voucher')}</span>
              </button>

              <a
                href={`https://wa.me/50687959148?text=${whatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs uppercase py-3 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] shadow-md cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>{language === 'es' ? 'Enviar a WhatsApp (+506)' : 'Send to WhatsApp (+506)'}</span>
              </a>
            </div>
            
            <button
              onClick={handleAddToTasks}
              disabled={isAddingTask}
              className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white disabled:opacity-70 font-bold text-xs uppercase py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              {isAddingTask ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ListTodo className="w-4 h-4" />
              )}
              <span>{isAddingTask ? (language === 'es' ? 'Añadiendo...' : 'Adding...') : (language === 'es' ? 'Añadir Recordatorio a Google Tasks' : 'Add to Google Tasks')}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
