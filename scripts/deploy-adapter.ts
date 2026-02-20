import { ethers } from "hardhat";
import { Contract } from "ethers";

export interface ONFTAdapterDeploymentParams {
  tokenAddress: string;
  lzEndpoint: string;
  delegate: string;
}

export async function deployONFTAdapter(params: ONFTAdapterDeploymentParams): Promise<{
  contract: Contract;
  address: string;
  deploymentTx: string;
}> {
  console.log("Deploying CustomONFTAdapter with parameters:", params);

  // Validate the token address (ethers v5: isAddress is on utils)
  if (!ethers.utils.isAddress(params.tokenAddress)) {
    throw new Error(`Invalid token address: ${params.tokenAddress}`);
  }

  if (!ethers.utils.isAddress(params.lzEndpoint)) {
    throw new Error(`Invalid LayerZero endpoint address: ${params.lzEndpoint}`);
  }

  // Get the contract factory
  const AdapterFactory = await ethers.getContractFactory("CustomONFTAdapter");

  // Deploy the contract
  const adapter = await AdapterFactory.deploy(
    params.tokenAddress,
    params.lzEndpoint,
    params.delegate
  );

  // Wait for deployment (ethers v5: use .address, not getAddress())
  await adapter.deployed();
  const address = adapter.address;
  const deploymentTx = adapter.deployTransaction?.hash || "";

  console.log(`CustomONFTAdapter deployed to: ${address}`);
  console.log(`Deployment transaction: ${deploymentTx}`);

  // Verify the deployment by checking the wrapped token
  try {
    const tokenInfo = await adapter.getTokenInfo();
    console.log(`Wrapped Token: ${tokenInfo.tokenAddress}`);
    console.log(`Token Name: ${tokenInfo.name}`);
    console.log(`Token Symbol: ${tokenInfo.symbol}`);
  } catch (error) {
    console.warn("Could not retrieve token info:", error);
  }

  return {
    contract: adapter as unknown as Contract,
    address,
    deploymentTx
  };
}

// Script execution (if run directly)
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Example deployment parameters
  const params: ONFTAdapterDeploymentParams = {
    tokenAddress: "0x0000000000000000000000000000000000000000", // Replace with actual NFT contract
    lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // Example endpoint
    delegate: deployer.address
  };

  // Validate required parameters
  if (params.tokenAddress === "0x0000000000000000000000000000000000000000") {
    console.error("Please provide a valid token address in the deployment parameters");
    process.exit(1);
  }

  try {
    const deployment = await deployONFTAdapter(params);
    
    console.log("\n=== Deployment Summary ===");
    console.log(`Adapter Address: ${deployment.address}`);
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
