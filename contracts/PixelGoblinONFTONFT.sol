// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";

/**
 * @title PixelGoblinONFTONFT
 * @dev ONFT721 contract for PixelGoblinONFT NFT collection
 */
contract PixelGoblinONFTONFT is ONFT721 {
    /**
     * @dev Constructor for the ONFT721 contract.
     * @param _name The name of the ONFT collection.
     * @param _symbol The symbol of the ONFT collection.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {}
    
    /**
     * @dev Mint function for the owner to create new NFTs
     * @param _to The address to mint the NFT to
     * @param _tokenId The token ID to mint
     */
    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }
}