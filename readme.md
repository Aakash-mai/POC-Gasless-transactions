# Meta-Transactions POC — MetaTx Branch

This README documents the **Meta-Transactions** (ERC-2771) proof‑of‑concept contained in the `meta-tx` branch. It explains how to compile and run the relayer POC, important configuration notes, and common troubleshooting steps.

---

## What this POC contains

- **Forwarder**: a minimal wrapper around OpenZeppelin's `ERC2771Forwarder` (`contracts/Forwarder.sol`).
- **Recipient**: Test contract that inherits `ERC2771Context` and uses `_msgSender()` (`contracts/Test.sol`).
- **Relayer script**: `scripts/relayer.js` — deploys contracts, creates an EIP-712 `ForwardRequest`, has the user sign it, and relayer calls `forwarder.execute(...)`.

This POC demonstrates the full flow: user signs off-chain (EIP-712) → relayer submits meta-tx → forwarder verifies and executes → recipient sees original signer via `_msgSender()`.

---

## Prerequisites

- Node.js 18+ (tested)
- npm
- Hardhat v2.x
- Project dependencies installed (run once):

```bash
npm install
```

> Make sure `@openzeppelin/contracts` and `ethers` v6 are present in `package.json`.

---

## Important commands

Compile the contracts:

```bash
npx hardhat compile
```

Run the relayer POC (ephemeral Hardhat network):

```bash
npx hardhat run scripts/relayer.js
```

---

## `relayer.js` behavior (quick)

1. Deploys `Forwarder` with a domain name (e.g. `"MyForwarder"`).
2. Deploys `Test` recipient and points it at the forwarder address.
3. Builds a `ForwardRequest` object (fields: `from`, `to`, `value`, `gas`, `deadline`, `data`).
4. Reads the **on-chain nonce** (`forwarder.nonces(from)`) and uses it when signing the typed data.
5. Signs the typed data using EIP-712 with domain `{ name: <name>, version: "1", chainId, verifyingContract }`.
6. Attaches `signature` to the request and calls `forwarder.execute(requestWithSignature)` from the relayer account.
7. Prints balances, transaction hash, and recipient stored state.

---

## Notes & gotchas

- **Domain version:** OpenZeppelin's `ERC2771Forwarder` initializes `EIP712(name, "1")`. Use `version: "1"` in your domain when signing.
- **Nonce:** The forwarder uses the on-chain `nonces(from)` inside the EIP-712 hash. Always fetch the nonce immediately before signing and include that nonce in the typed message you sign.
- **Typed structure must match contract:** Ensure the `types.ForwardRequest` used in the script exactly matches the fields and types in the forwarder `ForwardRequestData` type (including `deadline` as `uint48` if used).
- **Ethers version:** This repo uses `ethers@6.x`. Use `signer.signTypedData` or `signer._signTypedData` depending on your environment, and `ethers.verifyTypedData` to verify signatures locally. For balances use `signer.provider.getBalance(address)`.
- **ABI / Fragment errors:** If you see `no matching fragment` or `missing value for component`, check that the object you pass to `execute()` matches the struct in the ABI exactly (including `signature` inside the struct if required).

---

## Troubleshooting

- `TypeError: Cannot read properties of undefined (reading 'getSigners')`: run the script using Hardhat, not `node`. Use `npx hardhat run scripts/relayer.js`.

- `ERC2771ForwarderInvalidSigner`: usually a domain mismatch (name/version/chainId/verifyingContract) or typed `ForwardRequest` fields mismatch. Ensure domain `version` is `"1"`, and include the on-chain nonce in the signed typed data.

- `missing value for component signature`: the `ForwardRequest` struct in the contract includes `signature` — include it in the object you pass to `execute()`.

- `no matching fragment`: ABI mismatch; ensure you compiled after changing contracts and are using the correct contract factory name.

---

## Expected output (example)

When `npx hardhat run scripts/relayer.js` completes successfully you should see something like:

```
Deployer address: 0x5FbD...aa3
Forwarder deployed: 0x5FbD...aa3
Recipient deployed: 0xe7f1...512
User address: 0x7099...79C8
Relayer address: 0x3C44...93BC
User balance: 10000.0
Relayer balance: 9999.99
Relayer sending execute...
Meta-tx mined in tx: 0xabc123...def
lastSender: 0x7099...79C8
lastMsg: Hello ! This is a Meta Tx
User balance: 10000.0
Relayer balance: 9999.98
```
