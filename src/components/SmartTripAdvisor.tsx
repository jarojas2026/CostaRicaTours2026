import React from 'react';
import type { Language } from '../types';
import { FullTripJourneyBuilder } from './FullTripJourneyBuilder';

/**
 * Customer-facing AI advisor.
 * Keeps the existing SmartTripAdvisor entry point while delegating the actual
 * journey workflow to the shared full-trip builder, avoiding a second planner.
 */
export function SmartTripAdvisor({ language = 'es' }: { language?: Language }) {
  return <FullTripJourneyBuilder language={language} />;
}
