const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with: ${deployer.address}`);

  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  console.log(`NFT Contract deployed at: ${nft.target}`);

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(nft.target);
  await marketplace.waitForDeployment();
  console.log(`Marketplace Contract deployed at: ${marketplace.target}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment Failed:", error);
    process.exit(1);
  });
