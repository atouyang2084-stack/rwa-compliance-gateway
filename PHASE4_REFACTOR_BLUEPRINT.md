# RWA Compliance Gateway Refactor Blueprint

## Product Positioning

This repository now provides an ERC-3643-aligned RWA MVP with two explicit
execution surfaces:

- The backend ledger supports a deterministic local showcase without claiming
  that its `ledger://` settlement references are deployed token contracts.
- The Solidity suite provides the permissioned on-chain issuance, transfer,
  freeze, deposit, and redemption lifecycle.

Canonical ERC-3643 certification and production settlement require integration
with the complete standard suite and an independent security audit.

## Module Boundaries

### Frontend

- `frontend/lib/amounts.js`: decimal input conversion and BigInt display math.
- `frontend/lib/contracts.js`: ABI and environment-driven contract addresses.
- `frontend/pages/assets.js`: authenticated asset workflows; it never sends a
  sender address and requires the connected wallet to match the login account.
- `frontend/pages/kyc.js`: requires the connected wallet to match the
  authenticated account before submitting KYC data.

### Backend

- `backend/api/middleware.go`: JWT verification, role authorization, CORS, and
  per-IP rate limiting.
- `backend/api/secure_asset_handlers.go`: request validation and orchestration.
- `backend/internal/amount`: uint256-compatible smallest-unit arithmetic.
- `backend/internal/database/ledger.go`: atomic balances, nonce consumption,
  asset status updates, and append-only audit records.
- `backend/internal/database/compliance.go`: persisted jurisdiction state.
- `backend/internal/services/kyc.go`: explicit demo or external-provider KYC.
- `backend/internal/services/contract.go`: signed on-chain KYC hash anchoring.

### Contracts

- `ComplianceEngine`: KYC, roles, jurisdictions, blacklist, per-token
  whitelist, asset-manager binding, limits, and holder tracking.
- `RWAToken`: two-decimal permissioned token with an immutable supply
  controller, pause, allowance, and transfer compliance hooks.
- `AssetManager`: the exclusive mint/burn controller, issuance,
  valuation/supply peg, deposit, redemption, and asset status lifecycle.
- `OracleManager`: controlled valuation input.

## Security Invariants

1. Public registration always creates an `investor`.
2. The backend derives the actor from verified JWT claims.
3. Amounts are unsigned integer strings in smallest units and cannot exceed
   `uint256`.
4. Balance changes, nonce consumption, and audit insertion share one database
   transaction.
5. A nonce can be consumed only once.
6. Contract transfer checks are bound to the calling token.
7. Only registered token contracts can update holder state.
8. KYC, blacklist, whitelist, role, valuation, and asset status writes are
   role restricted.
9. A token can be registered only by its immutable supply controller.
10. Global issuers and administrators cannot call token `mint` or `burnFrom`
    unless they are the bound controller.
11. For the current 1:1 MVP, asset valuation, manager token units, and token
    `totalSupply` remain equal after every deposit and redemption.

## Audit Evidence

Each backend asset event contains:

- actor address
- action and asset ID
- smallest-unit amount
- target address
- request nonce
- previous event hash
- current SHA-256 event hash
- timestamp and human-readable details

`GET /v1/assets/audit-trail?assetId=...` returns `integrityVerified`. Any change
to a stored event breaks the hash chain and changes this value to `false`.
Solidity state changes also emit indexed events for chain-native evidence.

## Runtime Configuration

For a local showcase:

```env
KYC_MODE=demo
SANCTIONS_MODE=demo
JWT_SECRET=<strong-random-secret>
DATABASE_URL=./rwa_gateway.db
PORT=8081
ALLOWED_ORIGIN=http://localhost:3000
RATE_LIMIT_PER_MINUTE=120
```

For on-chain KYC hash anchoring:

```env
RPC_URL=<rpc-url>
ANCHOR_PRIVATE_KEY=<dedicated-relayer-private-key>
COMPLIANCE_ENGINE_ADDRESS=<deployed-compliance-engine>
```

Never use a treasury or administrator key as `ANCHOR_PRIVATE_KEY`. Store it in
an HSM or managed secrets service for production.

For an external KYC provider, omit `KYC_MODE=demo` and configure:

```env
KYC_SERVICE_API_KEY=<provider-key>
KYC_SERVICE_ENDPOINT=<provider-api-base-url>
```

## Verification Commands

```bash
cd backend
GOCACHE=/tmp/rwa-go-cache go test ./...
GOCACHE=/tmp/rwa-go-cache go vet ./...

cd ..
npm test
npx hardhat run scripts/deploy.js --network hardhat

cd frontend
npm run build
```

## Production Gate

Before processing real assets:

1. Replace demo sanctions data with a licensed screening provider.
2. Add SIWE challenge/response authentication and short-lived sessions.
3. Run a canonical ERC-3643 interoperability review.
4. Commission independent contract and application penetration tests.
5. Move relayer keys and JWT secrets into managed key infrastructure.
6. Add database backups, retention controls, and audit-log export to a SIEM.
