import { useCallback } from 'react';

export interface ChatAnalyticsEvent {
  action: 'message_sent' | 'message_received' | 'quick_reply_clicked' | 'tool_executed' | 'chat_opened' | 'chat_closed';
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function useChatAnalytics() {
  const trackChatEvent = useCallback((event: ChatAnalyticsEvent) => {
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', `cr_tour_chat_${event.action}`, {
          event_category: 'AI_Counter_Chat',
          event_label: event.label || '',
          value: event.value || 1,
          ...event.metadata
        });
      }
      console.log(`[GA4 Chat Analytics] cr_tour_chat_${event.action}`, event);
    } catch (err) {
      console.error('Error logging chat event to analytics:', err);
    }
  }, []);

  return { trackChatEvent };
}
