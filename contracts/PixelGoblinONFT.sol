// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PixelGoblinONFT
 * @dev ONFT721 contract for Pixel Goblin NFTs on destination chains
 * This contract will mint/burn NFTs when they are bridged from the source chain
 */
contract PixelGoblinONFT is ONFT721 {
    constructor(
        string memory _name,     // "Pixel Goblins"
        string memory _symbol,   // "PGOB"
        address _lzEndpoint,     // LayerZero endpoint address
        address _delegate        // Owner/delegate address
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {}

    /**
     * @dev Mint function for the owner (for initial setup if needed)
     */
    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }

    /**
     * @dev Set base URI for token metadata
     * Note: This calls the parent's setBaseURI function which is external
     */
    function updateBaseURI(string calldata _baseTokenURI) external onlyOwner {
        this.setBaseURI(_baseTokenURI);
    }
}
