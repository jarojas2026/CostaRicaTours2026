/**
 * Push notifications (Firebase Cloud Messaging).
 *
 * Extraído de server.ts sin cambios de comportamiento: rutas, middlewares y
 * orden de registro se conservan (ver tests/serverRoutes.contract.test.ts).
 */

import { requireFirebaseUser } from '../authMiddleware';
import { registerFcmToken, sendPushNotificationToUser } from '../fcmService';
import { createRouter, requireAdmin } from './shared';

/** Push notifications (FCM). */
export const fcmRouter = createRouter();

// ==========================================
// 📱 FIREBASE CLOUD MESSAGING (FCM) ENDPOINTS
// ==========================================
fcmRouter.post('/api/fcm/register', requireFirebaseUser, async (req, res) => {
  try {
    const { token, deviceInfo } = req.body || {};
    // The device token is always bound to the authenticated uid; a userId in
    // the body is ignored so nobody can subscribe to another user's pushes.
    const userId = String((req as any).user?.uid || '');
    if (!userId || !token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'token requerido' });
    }
    const result = await registerFcmToken(userId, token, typeof deviceInfo === 'string' ? deviceInfo.slice(0, 200) : undefined);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

fcmRouter.post('/api/fcm/send', requireAdmin, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    if (!userId || !title || !body) {
      return res.status(400).json({ success: false, error: 'userId, title y body requeridos' });
    }
    const result = await sendPushNotificationToUser(userId, title, body, data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
