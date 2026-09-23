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
