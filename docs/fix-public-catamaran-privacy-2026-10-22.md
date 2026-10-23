# Public operator identity leak — 2026-10-22

## Defect
One manually authored `src/data/toursCatalog.ts` listing embedded a private `providerId` and an operator-branded English title. This is exported as public client data and violates the project policy not to disclose the operator's identity before a verified booking.

## Change
Remove the public `providerId` and use a descriptive, operator-neutral English title. Preserve the existing tour ID, Spanish title, location, itinerary, price fields and customer journey. This change neither removes the internal supplier registry nor alters Firestore, booking state, or supplier matching.

## Verification
`tests/publicCatamaranPrivacy.test.ts` checks that the listing still exists and the provider identity is absent. Run TypeScript/build/privacy scanner and E2E before merge. Review generated assets for any remaining provider brands and verify the source-of-truth server mapping.

**Important:** internal `backend/nativeWorkflows.ts` may still contain legacy operator information. That is a separate private-source migration governed by PR #418 and must not be copied into public UI.
