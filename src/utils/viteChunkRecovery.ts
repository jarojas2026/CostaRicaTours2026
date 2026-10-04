export interface ChunkRecoveryEnvironment {
  addEventListener(type: string, listener: EventListener): void;
  location: Pick<Location, 'pathname' | 'reload'>;
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>;
}

const RECOVERY_KEY_PREFIX = 'crt:vite-chunk-recovery:';
const RECOVERY_COOLDOWN_MS = 30_000;

function getFailedChunkPath(event: Event & { payload?: unknown }, fallbackPath: string): string {
  const message = event.payload instanceof Error
    ? event.payload.message
    : typeof event.payload === 'string'
      ? event.payload
      : '';
  const url = message.match(/https?:\/\/[^\s"'<>]+/)?.[0];
  if (!url) return fallbackPath;

  try {
    return new URL(url).pathname;
  } catch {
    return fallbackPath;
  }
}

/** Recover once from a stale Vite chunk without trapping the visitor in reload loops. */
export function installViteChunkRecovery(targetWindow: ChunkRecoveryEnvironment = window): void {
  targetWindow.addEventListener('vite:preloadError', rawEvent => {
    const event = rawEvent as Event & { payload?: unknown };
    const key = `${RECOVERY_KEY_PREFIX}${getFailedChunkPath(event, targetWindow.location.pathname)}`;
    const now = Date.now();

    try {
      const previousAttempt = Number(targetWindow.sessionStorage.getItem(key));
      const elapsed = now - previousAttempt;
      if (Number.isFinite(previousAttempt) && previousAttempt > 0 && elapsed >= 0 && elapsed < RECOVERY_COOLDOWN_MS) {
        return;
      }
      targetWindow.sessionStorage.setItem(key, String(now));
    } catch {
      // If browser storage is unavailable, let the normal error boundary recover manually.
      return;
    }

    event.preventDefault();
    targetWindow.location.reload();
  });
}
