# Portable Voice Agent Desk

The Voice Agent Desk extends the existing Counter Desk to inbound phone calls without coupling the tourism platform to one hotel, PBX, or telephony vendor.

## Architecture

Hotel room phone/PBX → hotel DID or SIP/PBX forwarding → `POST /api/voice/incoming` → Voice Agent Desk → existing Counter Agent / tourism intelligence / memory → spoken response.

A caller can:
- ask for tours, routes, availability, reservations and local information;
- continue the same voice session while the operational AI keeps call memory;
- press 0 for a human Agent Desk operator when a human handoff is configured;
- receive the same evidence-aware answers used by the digital Counter Desk.

The implementation is provider-neutral at the application layer and accepts Twilio-style Voice webhook fields. It does not store telephony credentials in Git.

## Portable hotel model

A hotel only needs internet access plus one of these integration patterns:

1. **DID forwarding:** assign a dedicated number to the hotel and forward calls to the Voice Agent Desk webhook.
2. **PBX/SIP:** route the hotel's tourism/help extension to the same public voice gateway through the hotel's SIP/telephony provider.
3. **Speed dial from rooms:** configure a room phone button/short code that dials the hotel's assigned tourism number.

For hotel-specific context, use a dedicated DID or pass `hotelId`, `hotelName`, `room`, and `language` as provider metadata/query parameters. Do not trust room identity for authorization or payment actions.

## Environment

Required for production:

```env
VOICE_AGENT_DESK_ENABLED=true
PUBLIC_BASE_URL=https://your-public-domain
VOICE_PROVIDER_AUTH_TOKEN=provider-signing-secret
```

Optional human handoff:

```env
VOICE_HUMAN_NUMBERS=+506XXXXXXXX,+506YYYYYYYY
VOICE_HUMAN_LABEL=Agent Desk Costa Rica Tours
```

`VOICE_HUMAN_NUMBERS` accepts up to eight comma-separated E.164 numbers. Invalid values are ignored. `VOICE_HUMAN_NUMBER` remains supported for one operator.

The provider signing token is mandatory for every public webhook. Requests with a missing or invalid signature receive `403`; do not expose the webhook without configuring the provider's signing secret. Set the provider callback URLs to the public Vercel `/api/voice/...` routes so requests pass through the same private-backend gateway as the web Counter Desk.

## Endpoints

- `POST /api/voice/incoming` — inbound call greeting and speech collection.
- `POST /api/voice/respond` — processes speech/DTMF through the existing Counter Agent.
- `POST /api/voice/human-transfer` — records transfer completion.
- `POST /api/voice/status` — records provider call status.
- `GET /api/voice/config` — admin-only integration status.
- `GET /api/voice/calls/:callId` — admin-only call session record.

## Human Agent Desk

The human team can be distributed: each operator can answer from a mobile phone, office phone, hotel desk, or another internet-connected telephony client, depending on the connected provider. The application keeps the AI as the first line and uses a controlled human handoff rather than inventing operational commitments.

## Safety

- All provider callbacks validate `X-Twilio-Signature` using `VOICE_PROVIDER_AUTH_TOKEN`; callbacks fail closed when the token is absent.
- Only terminal provider call states receive an `endedAt` timestamp. `in-progress`, `ringing`, and other nonterminal callbacks do not close the session.
- Failed or unanswered human transfers return the caller to the AI voice prompt; completed transfers end the TwiML response.
- Empty speech retries are bounded. After three consecutive silent turns, the system tries a configured human destination or ends the call cleanly.
- DTMF `0` requests a human transfer; unsupported keys do not get misinterpreted as natural-language booking requests.
- No payment, booking confirmation, cancellation, or itinerary mutation is performed merely because a caller asks by voice.
- Voice context is labeled as `channel=voice` and remains connected to the existing operational memory.
- Human handoff is explicit.
- No telephony secret belongs in the repository.

### Technical failure recovery

After authenticated incoming/respond processing fails, the server returns an actionable TwiML response (HTTP 200), preserving language and hotel context. It warns that the business outcome is unverified and gathers **new** input rather than redirecting/replaying the original request. Two consecutive recoveries are permitted; further failures end with a website/WhatsApp contact message. This does not mark a reservation or payment successful. Authentication failures still fail closed.

The recovery offers key 0 only when human destinations are configured. A party size such as “one person” or “solo una persona” does not trigger human routing. These paths are covered by isolated regression tests; live telephony and provider latency must still be tested before enabling the line.

TwiML input reference: https://www.twilio.com/docs/voice/twiml/gather


## Full-stack reservation flow

The voice channel now participates in the same reservation brain as the web Counter Desk.

1. Caller asks for a tour or information.
2. Voice session is stored in `voice_call_sessions` and conversational memory uses `voice_<callId>`.
3. The existing AI agent can search the real catalog, consult memory and check live availability.
4. For a reservation, the AI collects the missing fields and presents a spoken summary.
5. Only explicit customer confirmation can invoke `create_reservation`.
6. The server rechecks availability and uses the existing transactional/idempotent booking service.
7. The resulting booking remains `pendiente_pago` until payment is verified server-side.
8. Payment confirmation, provider coordination and the existing booking state machine remain authoritative.
9. Human Agent Desk handoff is available for exceptions or decisions requiring human authority.

This makes the phone channel another interface to the same operational brain rather than a separate chatbot.

### AI voice

The current voice gateway uses neural provider text-to-speech through the provider's Voice `<Say>` capability. The application layer keeps telephony/TTS credentials outside Git and can later swap the synthesis provider without changing the tourism, memory or booking services.

## Production readiness boundary

The code path is implemented, but it is not proof that an operator number or telephony provider is active. Before announcing phone service, configure a real provider account/number, set the server secrets, register the incoming/response/status/transfer callback URLs, and complete an authenticated test call in Spanish and English. On October 1, 2026 the public Vercel `/api/health` and `/api/tours` returned HTTP 200, superseding the earlier observed gateway 503. This connectivity check does not verify voice provisioning, live calls, bookings or payments.
