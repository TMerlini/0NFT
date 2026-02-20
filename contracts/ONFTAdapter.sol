// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title CustomONFTAdapter
 * @dev An adapter that makes existing ERC721 tokens omnichain-compatible using LayerZero.
 * This contract locks the original NFTs on the source chain and mints/unlocks them on destination chains.
 */
contract CustomONFTAdapter is ONFT721Adapter {
    // Mapping to track which tokens are currently locked in this adapter
    mapping(uint256 => bool) public lockedTokens;
    
    // Events
    event TokenLocked(uint256 indexed tokenId, address indexed owner);
    event TokenUnlocked(uint256 indexed tokenId, address indexed owner);
    event AdapterConfigured(address indexed token, address indexed endpoint);

    /**
     * @dev Constructor to initialize the ONFT Adapter
     * @param _token Address of the existing ERC721 contract to make omnichain
     * @param _lzEndpoint LayerZero endpoint address for the current chain
     * @param _delegate Address that can configure LayerZero settings
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {
        require(_token != address(0), "Token address cannot be zero");
        require(_lzEndpoint != address(0), "LayerZero endpoint cannot be zero");
        
        emit AdapterConfigured(_token, _lzEndpoint);
    }

    /**
     * @dev Override the _debit function to handle token locking
     * This function is called when tokens are being sent cross-chain
     * @param _from Address sending the token
     * @param _tokenId The token ID being sent
     */
    function _debit(
        address _from,
        uint256 _tokenId,
        uint32 /* _dstEid */
    ) internal virtual override {
        // Ensure the token exists and the sender owns it
        require(innerToken.ownerOf(_tokenId) == _from, "Not the owner of the token");
        require(!lockedTokens[_tokenId], "Token is already locked");
        
        // Transfer the token to this adapter (lock it)
        innerToken.transferFrom(_from, address(this), _tokenId);
        
        // Mark the token as locked
        lockedTokens[_tokenId] = true;
        
        emit TokenLocked(_tokenId, _from);
    }

    /**
     * @dev Override the _credit function to handle token unlocking
     * This function is called when tokens are received from another chain
     * @param _toAddress Address receiving the token
     * @param _tokenId The token ID being received
     */
    function _credit(
        address _toAddress,
        uint256 _tokenId,
        uint32 /* _srcEid */
    ) internal virtual override {
        // Ensure the token is currently locked in this adapter
        require(lockedTokens[_tokenId], "Token is not locked in this adapter");
        
        // Unlock the token by transferring it to the recipient
        innerToken.transferFrom(address(this), _toAddress, _tokenId);
        
        // Mark the token as unlocked
        lockedTokens[_tokenId] = false;
        
        emit TokenUnlocked(_tokenId, _toAddress);
    }

    /**
     * @dev Check if a specific token is currently locked in this adapter
     */
    function isTokenLocked(uint256 tokenId) external view returns (bool) {
        return lockedTokens[tokenId];
    }

    /**
     * @dev Get information about the wrapped token
     */
    function getTokenInfo() external view returns (
        address tokenAddress,
        string memory name,
        string memory symbol
    ) {
        tokenAddress = address(innerToken);
        
        // Try to get name and symbol (not all ERC721s implement these)
        try IERC721Metadata(address(innerToken)).name() returns (string memory _name) {
            name = _name;
        } catch {
            name = "Unknown";
        }
        
        try IERC721Metadata(address(innerToken)).symbol() returns (string memory _symbol) {
            symbol = _symbol;
        } catch {
            symbol = "UNKNOWN";
        }
    }

    /**
     * @dev Emergency function to unlock a token (owner only)
     * This should only be used in extreme circumstances
     */
    function emergencyUnlock(uint256 tokenId, address to) external onlyOwner {
        require(lockedTokens[tokenId], "Token is not locked");
        require(to != address(0), "Cannot unlock to zero address");
        
        innerToken.transferFrom(address(this), to, tokenId);
        lockedTokens[tokenId] = false;
        
        emit TokenUnlocked(tokenId, to);
    }

    /**
     * @dev Check if this adapter supports a specific interface
     * Note: ERC165 support is handled by parent contracts
     */

    /**
     * @dev Get the total number of tokens currently locked in this adapter
     */
    function getLockedTokenCount() external pure returns (uint256 count) {
        // Note: This is a simple implementation. For gas efficiency with large collections,
        // you might want to maintain a counter that increments/decrements on lock/unlock
        
        // This function would need to be implemented based on your specific needs
        // For now, we return 0 as a placeholder
        return 0;
    }

    /**
     * @dev Batch check if multiple tokens are locked
     */
    function areTokensLocked(uint256[] calldata tokenIds) external view returns (bool[] memory locked) {
        locked = new bool[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            locked[i] = lockedTokens[tokenIds[i]];
        }
    }
}

// Interface for ERC721 metadata (optional extension)
interface IERC721Metadata {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
