# Chainfly Energy Token (CET)
A payment + cashback + governance token powering the Chainfly energy ecosystem.


## Overview
- ERC-20 + Burnable + Ownable token with cashback issuance
- Solidity `^0.8.28`, Hardhat, OpenZeppelin Contracts v5
- Network focus: Polygon Amoy Testnet → Polygon Mainnet (planned)
- Roadmap: cashback engine, dashboard dApp, staking/liquidity, audit + launch

## Environment
Create a `.env` (ignored from git) with:
```
RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=<64-hex private key with 0x prefix>
POLYGONSCAN_API_KEY=<etherscan/polygonscan api key>
```

## Deployment Workflow
```bash
# 1. Install deps
npm install

# 2. Compile
npx hardhat compile

# 3. Deploy to Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy

# 4. Verify (Etherscan V2)
npx hardhat verify --network polygonAmoy <DEPLOYED_ADDRESS> <OWNER_ADDRESS>
```

## Current Deployment 
- Network: Polygon Amoy Testnet (`chainId 80002`)
- Contract: `0x77f676eEd95f7752C8e76287cd386ed63218f71d`
- Owner / deployer: `0x45F7eAFEc57d6a21F9170F9561C97552Aff0724f`
- Explorer: https://amoy.polygonscan.com/address/0x77f676eEd95f7752C8e76287cd386ed63218f71d
- Status: Verified on Polygonscan (constructor arg = owner address)
- Initial supply: `1,000,000 CET` minted to owner; mint/burn/cashback gated by `onlyOwner`

## Tech Stack
- Hardhat 2.26.0 (`@nomicfoundation/hardhat-toolbox` + Verify v2)
- Ethers v6 for both scripts/tests and the dApp
- OpenZeppelin Contracts 5.x (ERC-20, Burnable, Ownable)
- React 19 + Vite 7 frontend (`frontend/`)
- Jest-style Hardhat tests (Mocha + Chai)

## Frontend dApp (`frontend/`)
```bash
cd frontend
npm install
echo "VITE_CET_CONTRACT_ADDRESS=0x77f676eEd95f7752C8e76287cd386ed63218f71d" > .env
npm run dev                     # launches http://localhost:5173
```
- Connect MetaMask to Polygon Amoy (chainId 80002).
- Dashboard shows token metadata, total supply, wallet balance, and owner address.
- Built-in flows: wallet connect, refresh state, burn CET from connected account, owner-only cashback minting UI.
- Update `VITE_CET_CONTRACT_ADDRESS` whenever a new deployment goes live.

## Automated Tests
```bash
npm install        # root
npx hardhat test   # runs CETToken suite (6 specs) + template Lock tests
```
Coverage includes:
- Initial supply assigned to owner
- Owner-only guards for `mint`, `giveCashback`, `burnFrom`
- User burn flow + event assertions
- Cashback minting emits `Cashback` event and credits balances

## Next Phase Goals
1. Replace placeholder Lock tests with CET-only coverage and add gas snapshots.
2. Expand React dashboard with historical cashback feed + energy metrics.
3. Wire MetaMask actions into future Chainfly backend (wallet API, staking).
4. Prep for third-party audit + mainnet config (Polygon mainnet network + verify).

## Future Integrations
1. Chainfly Wallet API for cashback + payment tracking
2. Energy Points → CET converter
3. Staking module & liquidity incentives
4. dApp dashboard (balances, rewards, burn history)
5. External smart-contract audit pre-mainnet launch