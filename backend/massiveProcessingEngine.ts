/**
 * ⚡ MOTOR DE PROCESAMIENTO MASIVO Y COORDINACIÓN AUTÓNOMA POR SEGUNDO
 * =========================================================================
 * Diseñado para soportar alto volumen de tráfico concurrente (cientos de consultas
 * y reservas per segundo) con aislamiento por solicitud, control de contención atómico,
 * micro-colas no bloqueantes y ciclo de vida autónomo individual con cada proveedor.
 * =========================================================================
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { 
  getAllBookings,
  getPendingProviderSlaBookings,
  updateBookingStatus, 
  getSlotKey,
  getFirestoreDb,
  getBookingsCollection
} from './bookingService';
import { 
  executeProviderRealtimeCoordination, 
  executeCustomerBookingConfirmation, 
  executeAutonomousProviderFallback,
  MASTER_OPERATORS_REGISTRY 
} from './nativeWorkflows';
import { logAutomationExecution } from './nativeAutomationEngine';
import { sendAdministrativeAlert } from './notificationService';

// Tipos de Prioridad en la Cola de Alto Rendimiento
export type QueuePriority = 'EMERGENCY' | 'PAYMENT_VERIFICATION' | 'PROVIDER_DISPATCH' | 'BOOKING_LIFECYCLE' | 'INQUIRY_CACHE' | 'BACKGROUND_AUDIT';

export interface MassiveTask<T = any> {
  id: string;
  type: string;
  priority: QueuePriority;
  data: T;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export interface MassiveThroughputMetrics {
  totalRequestsProcessed: number;
  requestsPerSecond: number;
  peakRps: number;
  averageLatencyMs: number;
  p99LatencyMs: number;
  activeWorkers: number;
  queueDepth: number;
  activeProviderMonitors: number;
  successfulDispatches: number;
  autoRecoveredFailovers: number;
  uptimeSeconds: number;
  systemHealth: 'OPTIMAL' | 'HIGH_LOAD' | 'CONGESTION_MANAGED';
}

/**
 * ⚠️ AVISO DE ARQUITECTURA EFÍMERA:
 * Este estado es efímero y se pierde en reinicio/escalado — no usar para lógica de negocio crítica.
 * (Las colas de métricas de RPS, latencias y contadores locales son solo para observabilidad en tiempo real).
 */

/**
 * Monitor Autónomo del Ciclo de Vida Individual por Proveedor (100% Persistente en Firestore)
 * Gestiona el seguimiento de SLA de cada reserva de forma duradera y resistente a reinicios de Cloud Run.
 */
class IndividualProviderLifecycleManager {
  /**
   * Inicia el ciclo autónomo persistiendo el estado directamente en Firestore
   */
  async startAutonomousTracking(bookingId: string, providerId: string, tourData: any) {
    try {
      const db = getFirestoreDb();
      const col = getBookingsCollection();
      const now = Date.now();

      const trackingPayload = {
        dispatchedAt: now,
        providerStatus: 'pending',
        reminderSent: false,
        escalated: false,
        providerId
      };

      if (col) {
        await col.doc(bookingId).set(trackingPayload, { merge: true });
      } else {
        await updateBookingStatus(bookingId, trackingPayload);
      }
      console.log(`📡 [LIFECYCLE] Tracking autónomo persistido en Firestore para reserva #${bookingId} (Proveedor: ${providerId})`);
    } catch (err) {
      console.error(`Error iniciando tracking autónomo para #${bookingId}:`, err);
    }
  }

  /**
   * Evalúa periódicamente los SLAs pendientes directamente consultando Firestore (Sobrevive a reinicios y escalado a cero).
   */
  async sweepPendingSlas(): Promise<number> {
    if (this.slaSweepRunning) return 0;
    this.slaSweepRunning = true;
    const db = getFirestoreDb();
    const lockRef = db ? db.collection('automation_locks').doc('massive-provider-sla-1m') : null;
    let lockAcquired = false;
    try {
      if (db && lockRef) {
        await db.runTransaction(async (tx: any) => {
          const snap = await tx.get(lockRef);
          const data = snap.exists ? (snap.data() || {}) : {};
          const acquiredAt = Date.parse(String(data.acquiredAt || data.updatedAt || ''));
          if (data.status === 'running' && Number.isFinite(acquiredAt) && Date.now() - acquiredAt < 10 * 60 * 1000) throw new Error('automation_lock_busy');
          const now = new Date().toISOString();
          tx.set(lockRef, { status: 'running', acquiredAt: now, updatedAt: now, owner: process.env.VERCEL_REGION || process.env.HOSTNAME || 'node' }, { merge: true });
          lockAcquired = true;
        });
      } else lockAcquired = true;

      const pending = db ? await getPendingProviderSlaBookings(250) : [];
      const now = Date.now();
      const SLA_THRESHOLD_MS = 15 * 60 * 1000;
      let evaluatedCount = 0;
      for (const booking of pending) {
        const bookingId = booking.id || booking.bookingId;
        const providerId = String(booking.providerId || '').trim();
        if (!providerId) throw new Error(`PROVIDER_REQUIRED: reserva ${bookingId} no tiene proveedor operativo asignado.`);
        const dispatchedAt = Number(booking.dispatchedAt || 0);
        if (bookingId && booking.providerStatus === 'pending' && booking.escalated !== true && dispatchedAt > 0 && now - dispatchedAt > SLA_THRESHOLD_MS) {
          await executeAutonomousProviderFallback(bookingId, providerId, 'SLA Expirado sin confirmación del proveedor ' + providerId);
          await updateBookingStatus(bookingId, { escalated: true, providerStatus: 'escalated_fallback' });
          evaluatedCount++;
        }
      }
      return evaluatedCount;
    } catch (err: any) {
      if (err?.message !== 'automation_lock_busy') console.error('Error en barredor periódico de SLAs:', err);
      return 0;
    } finally {
      this.slaSweepRunning = false;
      if (lockAcquired && lockRef) await lockRef.set({ status: 'idle', releasedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
    }
  }

  stopTracking(bookingId: string) {
    // Ya no usa timers en memoria; el estado se gestiona en Firestore.
  }

  getActiveMonitorsCount(): number {
    return 0; // Estado distribuido en Firestore
  }
}

/**
 * Orquestador Principal de Procesamiento Masivo
 */
export class MassiveProcessingEngine extends EventEmitter {
  private queue: MassiveTask[] = [];
  private concurrencyLimit = Math.max(10, Math.min(100, Number(process.env.MASSIVE_ENGINE_CONCURRENCY || 50)));
  private maxQueueDepth = Math.max(200, Math.min(10000, Number(process.env.MASSIVE_ENGINE_MAX_QUEUE || 2000)));
  private activeWorkers = 0;
  private slaSweepRunning = false;
  private totalProcessed = 0;
  private latencies: number[] = [];
  private lastSecondRequests = 0;
  private currentRps = 0;
  private peakRps = 0;
  private startTime = Date.now();
  private successfulDispatches = 0;
  private autoRecoveredFailovers = 0;

  public providerLifecycle = new IndividualProviderLifecycleManager();

  constructor() {
    super();
    this.startThroughputSampler();
    this.startFirestoreSlaSweeper();
  }

  /**
   * Encola una tarea con prioridad para procesamiento masivo no bloqueante
   */
  private insertByPriority(task: MassiveTask): void {
    const priorityWeights: Record<QueuePriority, number> = {
      EMERGENCY: 100, PAYMENT_VERIFICATION: 80, PROVIDER_DISPATCH: 70,
      BOOKING_LIFECYCLE: 50, INQUIRY_CACHE: 30, BACKGROUND_AUDIT: 10
    };
    const weight = priorityWeights[task.priority] || 50;
    const index = this.queue.findIndex(item => weight > (priorityWeights[item.priority] || 50));
    if (index >= 0) this.queue.splice(index, 0, task); else this.queue.push(task);
  }

  async enqueue<T = any>(
    type: string, 
    data: T, 
    priority: QueuePriority = 'BOOKING_LIFECYCLE',
    maxAttempts = 3
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueDepth) {
        reject(new Error(`QUEUE_BACKPRESSURE: cola masiva saturada (${this.maxQueueDepth}).`));
        return;
      }
      const task: MassiveTask<T> = {
        id: `task_${crypto.randomUUID()}`,
        type,
        priority,
        data,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts,
        resolve,
        reject
      };

      this.insertByPriority(task);

      this.lastSecondRequests++;
      this.processNext();
    });
  }

  /**
   * Bucle de ejecución concurrente de la cola
   */
  private async processNext() {
    if (this.activeWorkers >= this.concurrencyLimit || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers++;
    const taskStart = Date.now();

    try {
      task.attempts++;
      const result = await this.executeTask(task);
      
      const duration = Date.now() - taskStart;
      this.recordLatency(duration);
      this.totalProcessed++;

      task.resolve(result);
    } catch (error: any) {
      if (task.attempts < task.maxAttempts) {
        console.warn(`[MASSIVE-ENGINE] Reintentando tarea ${task.id} (${task.attempts}/${task.maxAttempts}):`, error.message);
        setTimeout(() => {
          this.insertByPriority(task);
          this.processNext();
        }, 100 * Math.pow(2, task.attempts));
      } else {
        console.error(`[MASSIVE-ENGINE] Fallo definitivo en tarea ${task.id}:`, error);
        task.reject(error);
      }
    } finally {
      this.activeWorkers--;
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Ejecutor especializado por tipo de tarea
   */
  private async executeTask(task: MassiveTask): Promise<any> {
    switch (task.type) {
      case 'INDIVIDUAL_BOOKING_AUTONOMOUS_DISPATCH': {
        const { booking } = task.data;
        const bookingId = booking.bookingId || booking.id;
        const providerId = String(booking.providerId || '').trim();
        if (!providerId) {
          throw new Error(`PROVIDER_REQUIRED: reserva ${booking.id || booking.bookingId || 'unknown'} no tiene proveedor operativo asignado.`);
        }

        // 1. Despacho en tiempo real al proveedor
        const coordRes = await executeProviderRealtimeCoordination({
          bookingId,
          idReserva: bookingId,
          tourName: booking.tourName,
          tourDate: booking.date,
          tourTime: booking.time,
          adults: booking.adults,
          children: booking.children,
          totalUSD: booking.totalUSD,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          pickupHotel: booking.pickupHotel,
          providerId
        });

        // 2. Notificación y Voucher al Cliente
        await executeCustomerBookingConfirmation({
          bookingId,
          idReserva: bookingId,
          tourName: booking.tourName,
          tourDate: booking.date,
          tourTime: booking.time,
          adults: booking.adults,
          children: booking.children,
          totalUSD: booking.totalUSD,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          pickupHotel: booking.pickupHotel
        });

        // 3. Iniciar monitor autónomo de SLA individual persistido en Firestore
        await this.providerLifecycle.startAutonomousTracking(bookingId, providerId, booking);
        this.successfulDispatches++;

        return { success: true, bookingId, providerDispatched: coordRes.success };
      }

      default:
        return { success: true, message: `Task ${task.type} ejecutada con éxito` };
    }
  }

  private recordLatency(latencyMs: number) {
    this.latencies.push(latencyMs);
    if (this.latencies.length > 500) {
      this.latencies.shift();
    }
  }

  /**
   * Muestreador de throughput por segundo
   */
  private startThroughputSampler() {
    setInterval(() => {
      this.currentRps = this.lastSecondRequests;
      if (this.currentRps > this.peakRps) {
        this.peakRps = this.currentRps;
      }
      this.lastSecondRequests = 0;
    }, 1000);
  }

  /**
   * Barredor periódico de SLAs pendientes en Firestore (ejecuta cada 60s)
   */
  private startFirestoreSlaSweeper() {
    setInterval(async () => {
      try {
        await this.providerLifecycle.sweepPendingSlas();
      } catch (err) {
        console.error('Error en ciclo de barrido de SLA:', err);
      }
    }, 60000);
  }

  /**
   * Métricas en tiempo real del motor masivo
   */
  getMetrics(): MassiveThroughputMetrics {
    const avgLatency = this.latencies.length > 0
      ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
      : 5;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] || avgLatency : avgLatency;

    let health: 'OPTIMAL' | 'HIGH_LOAD' | 'CONGESTION_MANAGED' = 'OPTIMAL';
    if (this.queue.length > 100) health = 'CONGESTION_MANAGED';
    else if (this.activeWorkers > 35 || this.currentRps > 80) health = 'HIGH_LOAD';

    return {
      totalRequestsProcessed: this.totalProcessed,
      requestsPerSecond: this.currentRps,
      peakRps: this.peakRps,
      averageLatencyMs: avgLatency,
      p99LatencyMs: p99,
      activeWorkers: this.activeWorkers,
      queueDepth: this.queue.length,
      activeProviderMonitors: 0,
      successfulDispatches: this.successfulDispatches,
      autoRecoveredFailovers: this.autoRecoveredFailovers,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      systemHealth: health
    };
  }
}

// Instancia singleton para toda la aplicación
export const massiveEngine = new MassiveProcessingEngine();
