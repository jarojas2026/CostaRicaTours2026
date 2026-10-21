# Commerce owner access — critical sales onboarding fix

**Verified main bug:** `resolveOperatorAccess()` issues role `owner` for the authenticated proprietor, but `commerceAdminRouter` rejected every role other than literal `admin`. The owner therefore could not register verified suppliers, publish offers or dated inventory through the existing CommerceOperationsPanel.

**Minimal patch:** accept `owner` and `admin`, preserve rejection of `operator` and `OPERATOR_API_KEY`, preserve attestation, audit log, Firestore checks and existing routes. No role escalation, new credentials, new public endpoints or data mutations.

**QA:** `tests/commerceOwnerAccess.contract.test.ts`, lint, contracts, build, staging authenticated owner/admin/operator matrix. A green CI does not verify a real Firebase owner session; test that separately after PR #284 authentication is resolved.

**Rollback:** revert this single middleware predicate if a role-contract regression is found; do not broaden permissions beyond owner/admin.
