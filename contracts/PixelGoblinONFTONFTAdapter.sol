// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title PixelGoblinONFTONFTAdapter
 * @dev ONFT721Adapter for PixelGoblinONFT NFT collection
 * This contract uses the official LayerZero ONFT721Adapter implementation
 */
contract PixelGoblinONFTONFTAdapter is ONFT721Adapter {
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
}