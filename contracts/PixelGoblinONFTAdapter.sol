// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title PixelGoblinONFTAdapter
 * @dev ONFT721Adapter for existing Pixel Goblin NFT collection
 * This contract enables cross-chain transfers of existing Pixel Goblin NFTs
 */
contract PixelGoblinONFTAdapter is ONFT721Adapter {
    constructor(
        address _token,        // Pixel Goblin NFT contract address: 0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef
        address _lzEndpoint,   // LayerZero endpoint address
        address _delegate      // Owner/delegate address
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}
}
