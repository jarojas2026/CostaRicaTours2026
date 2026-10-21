# Weather source integrity — JARVIS/Sofía/Traveler safety
## Verified defect (main before this PR)
- `backend/weatherPulseService.ts` returned five fixed numeric weather profiles under `source:'fallback'` on provider failures; `observedAt` was set to now, making them look like current observations.
- Even a partial Open-Meteo JSON mixed defaults into a response labeled `source:'open-meteo'`.
- Cached weather lost translated labels on the second request.
- The daily hourly precipitation chance used array index 0 (midnight) rather than the observation hour.
- The public `DestinationPulse.tsx` displayed static temperatures/humidity and "live weather" even when the source failed.
- `agentKnowledgeFabric.ts` claimed 15-minute holds auto-expire, contradicted by `docs/estado-real-del-sistema.md` (TTL and atomic release not verified).

## Changes
- Source-verified complete observations only; no fabricated numeric fallback, no artificial observedAt.
- If all Open-Meteo calls fail, `destinations:[]` and top-level `source:'unavailable'`; frontend shows "Clima no disponible / Weather unavailable" and "—" for unknown readings.
- Align rain probability with the local observation hour.
- Retain labels in cache; empty responses cached briefly to prevent retry storms.
- Agent context includes source and observedAt; cannot call weather safe or promise unverified soft-hold expiry.
- No booking, payment, provider or geographical coordinate changes.

## Operational limits
- API `/api/weather/forecast` for tour cards is a separate, existing service; this PR does not claim to repair Cloud Run gateway.
- Time and age of weather data are as supplied by Open-Meteo (in its configured local timezone). No ETA, park safety, road or operating confirmation.
- Empty list means no verified weather available, not that every region is dry/sunny or zero risk.
- **Do not** use this response to automatically execute or guarantee adventure tours.

## QA
- `tests/weatherPulseTruth.test.ts` covers upstream failure, incomplete payloads, hour selection and cache labels.
- Run existing contract tests / build / lint / Playwright. Then check `/api/weather/destinations` on deployed backend with Open-Meteo working and disabled.
- This PR is subject to review and is not production until integrated and deployed.
