import { ethers } from "hardhat";
import { Contract } from "ethers";

export interface ONFTDeploymentParams {
  name: string;
  symbol: string;
  lzEndpoint: string;
  delegate: string;
  maxSupply: number;
  baseURI: string;
  mintPrice: string; // in ETH
  maxMintPerAddress: number;
}

export async function deployONFT(params: ONFTDeploymentParams): Promise<{
  contract: Contract;
  address: string;
  deploymentTx: string;
}> {
  console.log("Deploying CustomONFT with parameters:", params);

  // Get the contract factory
  const ONFTFactory = await ethers.getContractFactory("CustomONFT");

  // Convert mint price from ETH to wei
  const mintPriceWei = ethers.parseEther(params.mintPrice);

  // Deploy the contract
  const onft = await ONFTFactory.deploy(
    params.name,
    params.symbol,
    params.lzEndpoint,
    params.delegate,
    params.maxSupply,
    params.baseURI,
    mintPriceWei,
    params.maxMintPerAddress
  );

  // Wait for deployment
  await onft.waitForDeployment();
  const address = await onft.getAddress();
  const deploymentTx = onft.deploymentTransaction()?.hash || "";

  console.log(`CustomONFT deployed to: ${address}`);
  console.log(`Deployment transaction: ${deploymentTx}`);

  return {
    contract: onft,
    address,
    deploymentTx
  };
}

// Script execution (if run directly)
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Example deployment parameters
  const params: ONFTDeploymentParams = {
    name: "My Omnichain NFT",
    symbol: "MONFT",
    lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // Example endpoint
    delegate: deployer.address,
    maxSupply: 10000,
    baseURI: "https://api.example.com/metadata/",
    mintPrice: "0.01", // 0.01 ETH
    maxMintPerAddress: 10
  };

  try {
    const deployment = await deployONFT(params);
    
    console.log("\n=== Deployment Summary ===");
    console.log(`Contract Address: ${deployment.address}`);
    console.log(`Transaction Hash: ${deployment.deploymentTx}`);
    console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
    
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
