import React, { useState, useEffect } from 'react';
import { Calendar, Mail, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { auth, signInWithGoogle, getAccessToken, signOut } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface GoogleWorkspaceHubProps {
  language?: 'es' | 'en';
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({ language = 'es' }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Gmail state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState(language === 'es' ? 'Mi Itinerario de Viaje - Costa Rica Tours' : 'My Costa Rica Tours Itinerary');
  const [emailBody, setEmailBody] = useState(
    language === 'es'
      ? '¡Hola!\n\nAquí tienes el resumen de tus experiencias y reservas con Costa Rica Tours.\n\n¡Pura Vida!'
      : 'Hello!\n\nHere is the summary of your experiences and bookings with Costa Rica Tours.\n\nPura Vida!'
  );
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await getAccessToken();
        setAccessToken(token);
        if (token) {
          fetchCalendarEvents(token);
        }
      } else {
        setAccessToken(null);
        setCalendarEvents([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({
          type: 'success',
          text: language === 'es' ? '¡Conectado exitosamente con Google Workspace (Gmail y Calendar)!' : 'Successfully connected with Google Workspace (Gmail & Calendar)!'
        });
        fetchCalendarEvents(res.accessToken);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || (language === 'es' ? 'Error al conectar con Google' : 'Error connecting to Google')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await signOut();
    setUser(null);
    setAccessToken(null);
    setCalendarEvents([]);
    setStatusMessage({
      type: 'success',
      text: language === 'es' ? 'Sesión cerrada correctamente' : 'Logged out successfully'
    });
  };

  const fetchCalendarEvents = async (token: string) => {
    setSyncingCalendar(true);
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleSyncTourToCalendar = async (tourName: string, tourDate: string) => {
    if (!accessToken) {
      alert(language === 'es' ? 'Por favor conecta tu cuenta de Google primero' : 'Please connect your Google account first');
      return;
    }

    setSyncingCalendar(true);
    try {
      const eventDate = tourDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const event = {
        summary: `Costa Rica Tour: ${tourName}`,
        description: 'Reservado a través de Costa Rica Tours (Plataforma Oficial). ¡Pura Vida!',
        start: {
          date: eventDate
        },
        end: {
          date: eventDate
        },
        reminders: {
          useDefault: true
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (response.ok) {
        alert(language === 'es' ? '¡Tour sincronizado exitosamente con Google Calendar!' : 'Tour successfully synced to Google Calendar!');
        fetchCalendarEvents(accessToken);
      } else {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to create event');
      }
    } catch (err: any) {
      alert(`${language === 'es' ? 'Error al sincronizar' : 'Sync error'}: ${err.message}`);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleSendEmailViaGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      alert(language === 'es' ? 'Por favor conecta tu cuenta de Google primero' : 'Please connect your Google account first');
      return;
    }
    if (!recipientEmail) {
      alert(language === 'es' ? 'Por favor ingresa un correo electrónico de destino' : 'Please enter a recipient email');
      return;
    }

    setSendingEmail(true);
    try {
      const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(emailSubject)))}?=`;
      const emailContent = [
        `To: ${recipientEmail}`,
        `Subject: ${utf8Subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        emailBody
      ].join('\r\n');

      const encodedMessage = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (response.ok) {
        alert(language === 'es' ? '¡Correo enviado exitosamente vía Gmail API!' : 'Email successfully sent via Gmail API!');
        setRecipientEmail('');
      } else {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to send email');
      }
    } catch (err: any) {
      alert(`${language === 'es' ? 'Error al enviar correo' : 'Error sending email'}: ${err.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-emerald-100 dark:border-slate-800 my-8">
      <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-800 pb-6 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'es' ? 'Integración con Google Workspace' : 'Google Workspace Integration'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'es' 
                ? 'Conecta tu cuenta para sincronizar reservas con Google Calendar y gestionar correos con Gmail.' 
                : 'Connect your account to sync bookings with Google Calendar and manage emails with Gmail.'}
            </p>
          </div>
        </div>

        <div>
          {user ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-red-200 dark:border-red-900"
            >
              {language === 'es' ? 'Desconectar' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{loading ? (language === 'es' ? 'Conectando...' : 'Connecting...') : (language === 'es' ? 'Conectar Google Workspace' : 'Connect Google Workspace')}</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 mb-6 rounded-xl flex items-center space-x-3 ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200'}`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {user ? (
        <div className="space-y-8">
          {/* User status card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-emerald-500" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center font-bold justify-center">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{user.displayName || user.email}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {language === 'es' ? '✓ Gmail y Google Calendar Activos' : '✓ Gmail & Google Calendar Active'}
                </p>
              </div>
            </div>
            <div className="text-xs px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
              OAuth 2.0 Connected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="bg-emerald-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold">
                    <Calendar className="w-5 h-5" />
                    <span>Google Calendar Sync</span>
                  </div>
                  <button
                    onClick={() => accessToken && fetchCalendarEvents(accessToken)}
                    disabled={syncingCalendar}
                    className="p-1.5 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg text-emerald-600 dark:text-emerald-300 transition-colors"
                    title="Actualizar eventos"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingCalendar ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  {language === 'es' 
                    ? 'Sincroniza tus experiencias de Costa Rica Tours directamente en tu calendario principal.'
                    : 'Sync your Costa Rica Tours experiences directly to your primary calendar.'}
                </p>

                <div className="space-y-2 mb-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {language === 'es' ? 'Próximos Eventos en tu Calendario' : 'Upcoming Calendar Events'}
                  </h4>
                  {calendarEvents.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      {language === 'es' ? 'No se encontraron eventos próximos.' : 'No upcoming events found.'}
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {calendarEvents.map((evt, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{evt.summary}</p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {evt.start?.date || new Date(evt.start?.dateTime).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleSyncTourToCalendar('Tour de Aguas Termales & Volcán Arenal', new Date(Date.now() + 172800000).toISOString().split('T')[0])}
                disabled={syncingCalendar}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>{language === 'es' ? 'Sincronizar Ejemplo (Tour Arenal)' : 'Sync Sample Tour (Arenal)'}</span>
              </button>
            </div>

            {/* Gmail Section */}
            <div className="bg-blue-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-blue-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400 font-bold mb-4">
                  <Mail className="w-5 h-5" />
                  <span>Gmail API Direct Send</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  {language === 'es'
                    ? 'Envía confirmaciones de reservas y itinerarios directamente usando tu cuenta de Gmail.'
                    : 'Send booking confirmations and itineraries directly using your Gmail account.'}
                </p>

                <form onSubmit={handleSendEmailViaGmail} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'es' ? 'Correo Destinatario' : 'Recipient Email'}
                    </label>
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="viajero@ejemplo.com"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'es' ? 'Asunto' : 'Subject'}
                    </label>
                    <input
                      type="text"
                      required
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'es' ? 'Mensaje' : 'Message'}
                    </label>
                    <textarea
                      rows={2}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs shadow transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingEmail ? (language === 'es' ? 'Enviando...' : 'Sending...') : (language === 'es' ? 'Enviar Correo vía Gmail' : 'Send Email via Gmail')}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {language === 'es' ? 'Conecta tu cuenta para comenzar' : 'Connect your account to get started'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {language === 'es'
              ? 'Accede con Google para habilitar las funciones automáticas de calendario y correo electrónico.'
              : 'Sign in with Google to enable automated calendar and email features.'}
          </p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow transition-all"
          >
            {loading ? (language === 'es' ? 'Conectando...' : 'Connecting...') : (language === 'es' ? 'Iniciar Sesión con Google' : 'Sign in with Google')}
          </button>
        </div>
      )}
    </div>
  );
};
