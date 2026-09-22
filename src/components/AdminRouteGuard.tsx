import React from 'react';
import type { Language } from '../types';

export function AdminRouteGuard({ language = 'es', children }: { language?: Language; children: React.ReactNode }) {
  return <>{children}</>;
}
