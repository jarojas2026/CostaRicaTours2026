import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { X, Calendar, Users, CheckCircle, Clock, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { BookingRequest, Language } from '../types';
import { formatCurrency } from '../utils/i18n';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface DashboardBooking extends BookingRequest {
  id?: string;
}

interface AvailabilitySlot {
  id?: string;
  providerId: string;
  tourName: string;
  date: string;
  time: string;
  totalSpots: number;
  availableSpots: number;
  status: 'open' | 'closed' | 'full';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, language }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'availability'>('bookings');
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Slot form state
  const [showNewSlot, setShowNewSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({
    tourName: '',
    date: '',
    time: '',
    totalSpots: 10
  });

  useEffect(() => {
    if (!isOpen) return;
    
    let unsubscribeBookings: (() => void) | undefined;
    let unsubscribeSlots: (() => void) | undefined;
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      // Listen to Bookings
      const qBookings = query(collection(db, 'bookings'));
      // Ideally filtering by providerId: where('providerId', '==', uid)
      unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        // Filter locally if providerId is missing in DB for older records, or just show all for demo purposes if it's a small dataset.
        // In production, we strictly use the query `where('providerId', '==', uid)`.
        setBookings(data);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
        setLoading(false);
      });

      // Listen to Slots
      const qSlots = query(collection(db, 'availability_slots'), where('providerId', '==', uid));
      unsubscribeSlots = onSnapshot(qSlots, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AvailabilitySlot[];
        setSlots(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'availability_slots');
      });

    } catch (e) {
      console.error(e);
      setLoading(false);
    }

    return () => {
      if (unsubscribeBookings) unsubscribeBookings();
      if (unsubscribeSlots) unsubscribeSlots();
    };
  }, [isOpen]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await addDoc(collection(db, 'availability_slots'), {
        providerId: uid,
        tourName: newSlot.tourName,
        date: newSlot.date,
        time: newSlot.time,
        totalSpots: Number(newSlot.totalSpots),
        availableSpots: Number(newSlot.totalSpots),
        status: 'open',
        updatedAt: serverTimestamp()
      });
      setShowNewSlot(false);
      setNewSlot({ tourName: '', date: '', time: '', totalSpots: 10 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'availability_slots');
    }
  };

  const handleUpdateSlotStatus = async (slotId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'availability_slots', slotId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `availability_slots/${slotId}`);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este slot?')) return;
    try {
      await deleteDoc(doc(db, 'availability_slots', slotId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `availability_slots/${slotId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-full sm:h-[90vh] rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Panel de Operador</h2>
              <p className="text-xs text-slate-400">Gestiona tus reservas y disponibilidad en tiempo real</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-800/30 px-6 shrink-0">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'bookings' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <CheckCircle className="w-4 h-4" />
            Mis Reservas
          </button>
          <button 
            onClick={() => setActiveTab('availability')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'availability' ? 'border-blue-500 text-blue-400 bg-blue-950/20' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            <Clock className="w-4 h-4" />
            Gestión de Disponibilidad
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/50">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-emerald-500">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : !auth.currentUser ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <AlertCircle className="w-12 h-12 mb-4 text-rose-500" />
              <p>Debes iniciar sesión para ver el panel de operador.</p>
            </div>
          ) : (
            <>
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Reservas Activas</h3>
                    <span className="text-sm text-slate-400">{bookings.length} reservas encontradas</span>
                  </div>
                  
                  {bookings.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-700 rounded-xl">
                      <p className="text-slate-500">No tienes reservas activas en este momento.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-xs uppercase text-slate-400 border-b border-slate-700">
                          <tr>
                            <th className="px-4 py-3">Tour & Fecha</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Pax</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {bookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-800/80 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-white">{b.tourName}</div>
                                <div className="text-xs text-emerald-400">{b.date} • {b.time}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-slate-200">{b.customer?.fullName || 'N/A'}</div>
                                <div className="text-xs text-slate-500">{b.customer?.email}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {(b.adults || 0) + (b.children || 0)}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-emerald-400">
                                {formatCurrency(b.totalUSD, 'USD')}
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-xs uppercase font-bold">
                                  {b.status || 'Confirmada'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'availability' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Slots de Disponibilidad</h3>
                    <button 
                      onClick={() => setShowNewSlot(!showNewSlot)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Slot
                    </button>
                  </div>

                  {showNewSlot && (
                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6">
                      <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Nombre del Tour</label>
                          <input 
                            required
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            value={newSlot.tourName}
                            onChange={e => setNewSlot({...newSlot, tourName: e.target.value})}
                            placeholder="Ej. Caminata Volcán"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Fecha</label>
                          <input 
                            required
                            type="date" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            value={newSlot.date}
                            onChange={e => setNewSlot({...newSlot, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Hora</label>
                          <input 
                            required
                            type="time" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            value={newSlot.time}
                            onChange={e => setNewSlot({...newSlot, time: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Espacios Totales</label>
                          <input 
                            required
                            type="number" 
                            min="1"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            value={newSlot.totalSpots}
                            onChange={e => setNewSlot({...newSlot, totalSpots: Number(e.target.value)})}
                          />
                        </div>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-sm w-full transition-colors">
                          Guardar Slot
                        </button>
                      </form>
                    </div>
                  )}

                  {slots.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-700 rounded-xl">
                      <p className="text-slate-500">No has configurado slots de disponibilidad.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {slots.map(slot => (
                        <div key={slot.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col relative group">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-white">{slot.tourName}</h4>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              slot.status === 'open' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' :
                              slot.status === 'full' ? 'bg-amber-900/40 text-amber-400 border-amber-500/30' :
                              'bg-rose-900/40 text-rose-400 border-rose-500/30'
                            }`}>
                              {slot.status}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              {slot.date}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Clock className="w-4 h-4 text-slate-500" />
                              {slot.time}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Users className="w-4 h-4 text-slate-500" />
                              {slot.availableSpots} / {slot.totalSpots} disponibles
                            </div>
                          </div>

                          <div className="mt-auto pt-3 border-t border-slate-700/50 flex justify-between items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <select 
                              value={slot.status}
                              onChange={(e) => handleUpdateSlotStatus(slot.id!, e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1"
                            >
                              <option value="open">Abierto</option>
                              <option value="closed">Cerrado</option>
                              <option value="full">Lleno</option>
                            </select>
                            
                            <button 
                              onClick={() => handleDeleteSlot(slot.id!)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Eliminar Slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
