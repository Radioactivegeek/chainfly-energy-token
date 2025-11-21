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
- Hardhat 2.26.0 (`@nomicfoundation/hardhat-toolbox`)
- Ethers v6, Hardhat Verify (Etherscan API v2 config)
- OpenZeppelin Contracts 5.x
- Testing stack 5