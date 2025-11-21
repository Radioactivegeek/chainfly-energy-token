require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log("✅ Wallet Address:", wallet.address);
}

main();
