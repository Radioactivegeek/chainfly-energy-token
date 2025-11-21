require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY, POLYGONSCAN_API_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    polygonAmoy: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
     etherscan: {
     apiKey: POLYGONSCAN_API_KEY,
     customChains: [
       {
         network: "polygonAmoy",
         chainId: 80002,
         urls: {
           apiURL: "https://api-amoy.polygonscan.com/api",
           browserURL: "https://amoy.polygonscan.com",
         },
       },
     ],
   },
};
