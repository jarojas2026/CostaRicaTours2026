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

`VOICE_HUMAN_NUMBER` remains supported for a single operator.

## Endpoints

- `POST /api/voice/incoming` — inbound call greeting and speech collection.
- `POST /api/voice/respond` — processes speech/DTMF through the existing Counter Agent.
- `POST /api/voice/human-transfer` — records transfer completion.
- `POST /api/voice/status` — records provider call status.
- `GET /api/voice/config` — admin-only integration status.

## Human Agent Desk

The human team can be distributed: each operator can answer from a mobile phone, office phone, hotel desk, or another internet-connected telephony client, depending on the connected provider. The application keeps the AI as the first line and uses a controlled human handoff rather than inventing operational commitments.

## Safety

- Provider signature validation is enabled automatically when `VOICE_PROVIDER_AUTH_TOKEN` is configured.
- No payment, booking confirmation, cancellation, or itinerary mutation is performed merely because a caller asks by voice.
- Voice context is labeled as `channel=voice` and remains connected to the existing operational memory.
- Human handoff is explicit.
- No telephony secret belongs in the repository.


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
