import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads LayerZero source files from node_modules for compilation
 */
export class LayerZeroSourceReader {
  private static readonly ONFT_EVM_PATH = path.join(process.cwd(), 'node_modules', '@layerzerolabs', 'onft-evm', 'contracts');
  private static readonly OAPP_EVM_PATH = path.join(process.cwd(), 'node_modules', '@layerzerolabs', 'lz-evm-oapp-v2', 'contracts');
  private static readonly OPENZEPPELIN_PATH = path.join(process.cwd(), 'node_modules', '@openzeppelin', 'contracts');

  /**
   * Reads a Solidity file and resolves its imports recursively
   */
  static readSolidityFile(filePath: string, visited: Set<string> = new Set()): string {
    const normalizedPath = path.normalize(filePath);
    
    // Prevent infinite loops
    if (visited.has(normalizedPath)) {
      return '';
    }
    visited.add(normalizedPath);

    if (!fs.existsSync(normalizedPath)) {
      console.warn(`⚠️ File not found: ${normalizedPath}`);
      return '';
    }

    let content = fs.readFileSync(normalizedPath, 'utf8');
    const dir = path.dirname(normalizedPath);

    // Resolve imports
    const importRegex = /import\s+["']([^"']+)["']\s*;/g;
    let match;
    const imports: string[] = [];

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = this.resolveImport(importPath, dir);
      
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        const importedContent = this.readSolidityFile(resolvedPath, visited);
        if (importedContent && !imports.includes(importedContent)) {
          imports.push(importedContent);
        }
      }
    }

    // Return imports first, then the file content
    return imports.join('\n\n') + '\n\n' + content;
  }

  /**
   * Resolves import paths to actual file paths
   */
  static resolveImport(importPath: string, fromDir: string): string | null {
    // Handle npm package imports
    if (importPath.startsWith('@layerzerolabs/onft-evm/')) {
      const relativePath = importPath.replace('@layerzerolabs/onft-evm/', '');
      return path.join(this.ONFT_EVM_PATH, relativePath);
    }
    
    if (importPath.startsWith('@layerzerolabs/lz-evm-oapp-v2/') || importPath.startsWith('@layerzerolabs/oapp-evm/')) {
      const relativePath = importPath.replace(/@layerzerolabs\/(lz-evm-oapp-v2|oapp-evm)\//, '');
      return path.join(this.OAPP_EVM_PATH, relativePath);
    }
    
    if (importPath.startsWith('@openzeppelin/')) {
      const relativePath = importPath.replace('@openzeppelin/contracts/', '');
      return path.join(this.OPENZEPPELIN_PATH, relativePath);
    }

    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(fromDir, importPath);
    }

    return null;
  }

  /**
   * Gets all source files needed for compiling an ONFT Adapter
   */
  static getONFTAdapterSources(): { [filename: string]: { content: string } } {
    const sources: { [filename: string]: { content: string } } = {};

    try {
      // Read the main ONFT721Adapter contract
      const adapterPath = path.join(this.ONFT_EVM_PATH, 'onft721', 'ONFT721Adapter.sol');
      if (fs.existsSync(adapterPath)) {
        sources['onft721/ONFT721Adapter.sol'] = {
          content: fs.readFileSync(adapterPath, 'utf8')
        };
      }

      // Read ONFT721Core
      const corePath = path.join(this.ONFT_EVM_PATH, 'onft721', 'ONFT721Core.sol');
      if (fs.existsSync(corePath)) {
        sources['onft721/ONFT721Core.sol'] = {
          content: fs.readFileSync(corePath, 'utf8')
        };
      }

      // Note: For full compilation, we'd need to include all dependencies
      // This is a simplified version. For production, use Hardhat's flatten or similar tool.
      
    } catch (error) {
      console.error('Error reading LayerZero sources:', error);
    }

    return sources;
  }

  /**
   * Creates a simple wrapper contract that uses the real ONFT721Adapter
   */
  static generateWrapperContract(
    contractName: string,
    contractAddress: string,
    collectionName: string
  ): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title ${contractName}
 * @dev ONFT721Adapter for ${collectionName} NFT collection
 * This contract uses the official LayerZero ONFT721Adapter implementation
 */
contract ${contractName} is ONFT721Adapter {
    /**
     * @dev Constructor for the ONFT721Adapter contract.
     * @param _token The underlying ERC721 token address this adapts
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}
}`;
  }
}

