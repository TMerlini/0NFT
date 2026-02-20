// Browser-based Solidity compiler using solc-js
// Note: solc needs to be loaded dynamically in browser environment

interface CompilationInput {
  contractType: 'adapter' | 'onft';
  contractAddress?: string;
  collectionName: string;
  collectionSymbol: string;
}

interface CompilationResult {
  bytecode: string;
  abi: any[];
  contractName: string;
}

export class BrowserCompiler {
  private static solcVersion = '0.8.22';

  private static async compileInWorker(solcInput: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create Web Worker
      const worker = new Worker('/solc-worker.js');
      const id = Math.random().toString(36).substr(2, 9);
      
      // Set up message handler
      worker.onmessage = (e) => {
        const { id: responseId, success, output, error } = e.data;
        
        if (responseId === id) {
          worker.terminate();
          
          if (success) {
            resolve(output);
          } else {
            reject(new Error(error));
          }
        }
      };
      
      // Handle worker errors
      worker.onerror = (error) => {
        worker.terminate();
        reject(new Error(`Worker error: ${error.message}`));
      };
      
      // Send compilation request to worker
      worker.postMessage({ solcInput, id });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Compilation timeout'));
      }, 30000);
    });
  }

  static async compile(input: CompilationInput): Promise<CompilationResult> {
    console.log('🔧 Starting browser-based Solidity compilation...');

    // Generate contract source code
    const contractName = this.generateContractName(input.collectionName, input.contractType);
    const sourceCode = this.generateSourceCode(input, contractName);

    console.log('📝 Generated contract:', contractName);
    console.log('📄 Source code length:', sourceCode.length, 'characters');

    // Prepare compilation input
    const solcInput = {
      language: 'Solidity',
      sources: {
        [`${contractName}.sol`]: {
          content: sourceCode
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    try {
      // Use Web Worker to avoid WebAssembly main thread issues
      console.log('👷 Starting compilation in Web Worker...');
      const output = await this.compileInWorker(solcInput);

      // Check for compilation errors
      if (output.errors) {
        const errors = output.errors.filter((error: any) => error.severity === 'error');
        if (errors.length > 0) {
          console.error('❌ Compilation errors:', errors);
          throw new Error(`Compilation failed: ${errors.map((e: any) => e.formattedMessage).join('\n')}`);
        }
      }

      // Extract compiled contract
      const contract = output.contracts[`${contractName}.sol`][contractName];
      
      if (!contract) {
        throw new Error('Contract not found in compilation output');
      }

      const result = {
        bytecode: contract.evm.bytecode.object,
        abi: contract.abi,
        contractName
      };

      console.log('✅ Compilation successful!');
      console.log('📦 Bytecode length:', result.bytecode.length, 'characters');
      console.log('🔧 ABI functions:', result.abi.length);

      return result;

    } catch (error: any) {
      console.error('❌ Browser compilation failed:', error);
      throw new Error(`Browser compilation failed: ${error.message}`);
    }
  }

  private static generateContractName(collectionName: string, contractType: string): string {
    const cleanName = collectionName.replace(/[^a-zA-Z0-9]/g, '');
    return contractType === 'adapter' 
      ? `${cleanName}ONFTAdapter`
      : `${cleanName}ONFT`;
  }

  private static generateSourceCode(input: CompilationInput, contractName: string): string {
    if (input.contractType === 'adapter') {
      return this.generateAdapterContract(input, contractName);
    } else {
      return this.generateONFTContract(input, contractName);
    }
  }

  private static generateAdapterContract(input: CompilationInput, contractName: string): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev ONFT721Adapter for ${input.collectionName} NFT collection
 * This contract enables cross-chain transfers of existing ${input.collectionName} NFTs
 */
contract ${contractName} is ONFT721Adapter {
    constructor(
        address _token,        // ${input.contractAddress}
        address _lzEndpoint,   // LayerZero endpoint address
        address _delegate      // Owner/delegate address
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
    
    /**
     * @dev Returns the name of the adapted collection
     */
    function collectionName() external pure returns (string memory) {
        return "${input.collectionName}";
    }
}`;
  }

  private static generateONFTContract(input: CompilationInput, contractName: string): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev ONFT721 contract for ${input.collectionName} on destination chains
 * This contract will mint/burn NFTs when they are bridged from the source chain
 */
contract ${contractName} is ONFT721 {
    constructor(
        string memory _name,     // "${input.collectionName}"
        string memory _symbol,   // "${input.collectionSymbol}"
        address _lzEndpoint,     // LayerZero endpoint address
        address _delegate        // Owner/delegate address
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}

    /**
     * @dev Mint function for the owner (for initial setup if needed)
     */
    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }

    /**
     * @dev Batch mint function for efficiency
     */
    function batchMint(address _to, uint256[] calldata _tokenIds) external onlyOwner {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            _mint(_to, _tokenIds[i]);
        }
    }
}`;
  }
}

// Usage example:
/*
const compiler = new BrowserCompiler();
const result = await compiler.compile({
  contractType: 'adapter',
  contractAddress: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef',
  collectionName: 'Pixel Goblins',
  collectionSymbol: 'PGOB'
});

// Use result.bytecode and result.abi for deployment
*/
