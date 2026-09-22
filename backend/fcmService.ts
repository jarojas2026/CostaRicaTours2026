import { getFirestoreDb } from './bookingService';

export async function registerFcmToken(userId: string, token: string, deviceInfo?: string) {
  const db = getFirestoreDb();
  if (!db) return { success: false, error: 'Firestore not available' };

  try {
    await db.collection('fcm_tokens').doc(`${userId}_${token.substring(0, 15)}`).set({
      userId,
      token,
      deviceInfo: deviceInfo || 'web_browser',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`📱 [FCM] Token registrado para usuario ${userId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`❌ [FCM] Error registrando token:`, err);
    return { success: false, error: err.message };
  }
}

export async function sendPushNotificationToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
  const db = getFirestoreDb();
  if (!db) return { success: false, error: 'Firestore not available' };

  try {
    const snap = await db.collection('fcm_tokens').where('userId', '==', userId).get();
    if (snap.empty) {
      console.log(`ℹ️ [FCM] No hay tokens registrados para el usuario ${userId}`);
      return { success: true, delivered: 0 };
    }

    let delivered = 0;
    const batch = db.batch();
    
    snap.docs.forEach(doc => {
      const tokenData = doc.data();
      const notifRef = db.collection('push_notifications_queue').doc();
      batch.set(notifRef, {
        userId,
        token: tokenData.token,
        title,
        body,
        data: data || {},
        status: 'queued',
        createdAt: new Date().toISOString()
      });
      delivered++;
    });

    await batch.commit();
    console.log(`🚀 [FCM] ${delivered} notificaciones push encoladas para el usuario ${userId}`);
    return { success: true, delivered };
  } catch (err: any) {
    console.error(`❌ [FCM] Error enviando push:`, err);
    return { success: false, error: err.message };
  }
}
