/**
 * Routers de dominio en el orden exacto de registro del server.ts original.
 * El orden importa: Express evalúa las capas secuencialmente.
 */
import type { Router } from 'express';
import { paymentWebhooksRouter, checkoutRouter, sinpeRouter, sinpeWebhooksRouter } from './payments';
import { customerIntakeRouter } from './intake';
import { healthRouter, weatherRouter, opsMetricsRouter } from './misc';
import { aiJourneyRouter, journeyRouter } from './journey';
import { adminRouter, operationsSweepRouter } from './admin';
import { aiIntelligenceRouter, aiOpsRouter, modelGatewayRouter } from './ai';
import { slaCalendarRouter, bookingsRouter } from './bookings';
import { toursRouter } from './tours';
import { providerOpsRouter, providerPortalRouter } from './provider';
import { counterRouter } from './counter';
import { voiceRouter } from './voice';
import { nativeWorkflowsRouter, legacyWebhooksRouter, operationalJobsRouter } from './automations';
import { agentsRouter, agentToolsRouter } from './agents';
import { chatRouter } from './chat';
import { fcmRouter } from './fcm';
import { leadsRouter } from './leads';
import { voiceTtsRouter } from './voiceTts';

export const domainRouters: readonly Router[] = [
  paymentWebhooksRouter,
  customerIntakeRouter,
  healthRouter,
  aiJourneyRouter,
  adminRouter,
  journeyRouter,
  operationsSweepRouter,
  aiIntelligenceRouter,
  checkoutRouter,
  slaCalendarRouter,
  toursRouter,
  sinpeRouter,
  bookingsRouter,
  providerOpsRouter,
  counterRouter,
  voiceRouter,
  weatherRouter,
  aiOpsRouter,
  nativeWorkflowsRouter,
  legacyWebhooksRouter,
  providerPortalRouter,
  operationalJobsRouter,
  sinpeWebhooksRouter,
  opsMetricsRouter,
  agentsRouter,
  modelGatewayRouter,
  chatRouter,
  agentToolsRouter,
  fcmRouter,
  leadsRouter,
  voiceTtsRouter,
];
