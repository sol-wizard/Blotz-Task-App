# ADR-003: Auth0 Environment Setup

**Date:** 2026-05-28
**Status:** Accepted

## 1. Single tenant, split by Application (not multi-tenant)

- **Setup:** One Auth0 tenant. Prod and staging are separated by using **different Auth0 Applications** within that single tenant — not separate tenants.
- **Implication for Actions (e.g. Sync User):** an Action and its secrets live once at the tenant level and run for both environments, so the Action code must branch on the environment (e.g. `event.client` / app, or an env signal) to pick the right backend URL. There is no per-tenant isolation to lean on.
- **Rejected:** separate tenants per environment — heavier to manage; not needed at current scale.

## 2. Backend URL config in the Sync User Action

- The Sync User Action calls our backend `SyncUser` endpoint on login; the staging vs prod base URL is chosen in the Action code.
- Follow-up to move the hardcoded `STAGING_URL` / `PROD_URL` into `event.secrets` is tracked in **Blotz-Task-App-Private #1387**. Because we are single-tenant, the env-selection branching in the Action stays — secrets only change the *source* of the URL string, not the branching.
