const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying CETToken with account:", deployer.address);

  const CETToken = await hre.ethers.getContractFactory("CETToken");
  const token = await CETToken.deploy(deployer.address);

  await token.waitForDeployment();

  console.log("CETToken deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
