// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CustomONFT
 * @dev A custom Omnichain Non-Fungible Token (ONFT) that can be transferred across different blockchains
 * using LayerZero's infrastructure. This contract extends the ONFT721 standard.
 */
contract CustomONFT is ONFT721 {
    // Maximum supply of NFTs
    uint256 public maxSupply;
    
    // Current token ID counter
    uint256 private _currentTokenId;
    
    // Note: baseTokenURI is inherited from ONFT721 parent contract
    
    // Mapping to track minted tokens per address
    mapping(address => uint256) public mintedCount;
    
    // Maximum mint per address
    uint256 public maxMintPerAddress;
    
    // Mint price (can be 0 for free mint)
    uint256 public mintPrice;
    
    // Events
    event TokenMinted(address indexed to, uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event MintPriceUpdated(uint256 newMintPrice);
    event MaxMintPerAddressUpdated(uint256 newMaxMintPerAddress);

    /**
     * @dev Constructor to initialize the ONFT
     * @param _name Name of the NFT collection
     * @param _symbol Symbol of the NFT collection
     * @param _lzEndpoint LayerZero endpoint address for the current chain
     * @param _delegate Address that can configure LayerZero settings
     * @param _maxSupply Maximum number of NFTs that can be minted
     * @param _mintPrice Price to mint each NFT (in wei)
     * @param _maxMintPerAddress Maximum NFTs one address can mint
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate,
        uint256 _maxSupply,
        string memory /* _initialBaseURI */,
        uint256 _mintPrice,
        uint256 _maxMintPerAddress
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {
        maxSupply = _maxSupply;
        // Base URI can be set after deployment using updateBaseURI()
        // We store it here for reference but don't set it in constructor
        mintPrice = _mintPrice;
        maxMintPerAddress = _maxMintPerAddress;
        _currentTokenId = 1; // Start token IDs from 1
    }

    /**
     * @dev Mint NFTs to a specific address
     * @param _to Address to mint NFTs to
     * @param _quantity Number of NFTs to mint
     */
    function mint(address _to, uint256 _quantity) external payable {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_currentTokenId + _quantity - 1 <= maxSupply, "Exceeds maximum supply");
        require(mintedCount[_to] + _quantity <= maxMintPerAddress, "Exceeds maximum mint per address");
        require(msg.value >= mintPrice * _quantity, "Insufficient payment");

        // Update minted count
        mintedCount[_to] += _quantity;

        // Mint tokens
        for (uint256 i = 0; i < _quantity; i++) {
            uint256 tokenId = _currentTokenId;
            _currentTokenId++;
            
            _safeMint(_to, tokenId);
            emit TokenMinted(_to, tokenId);
        }
    }

    /**
     * @dev Owner-only mint function for airdrops or special mints
     * @param _to Address to mint NFTs to
     * @param _quantity Number of NFTs to mint
     */
    function ownerMint(address _to, uint256 _quantity) external onlyOwner {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_currentTokenId + _quantity - 1 <= maxSupply, "Exceeds maximum supply");

        for (uint256 i = 0; i < _quantity; i++) {
            uint256 tokenId = _currentTokenId;
            _currentTokenId++;
            
            _safeMint(_to, tokenId);
            emit TokenMinted(_to, tokenId);
        }
    }

    /**
     * @dev Get the base URI for token metadata
     * Note: We use the parent's _baseURI() which reads from baseTokenURI
     * We set baseTokenURI via setBaseURI() in the constructor and updateBaseURI()
     */

    /**
     * @dev Get the total number of tokens minted
     */
    function totalSupply() external view returns (uint256) {
        return _currentTokenId - 1;
    }

    /**
     * @dev Check if a token exists
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // Admin functions

    /**
     * @dev Update the base URI (owner only)
     * Note: This calls the parent's setBaseURI function which is external
     */
    function updateBaseURI(string calldata _newBaseURI) external onlyOwner {
        this.setBaseURI(_newBaseURI);
        emit BaseURIUpdated(_newBaseURI);
    }

    /**
     * @dev Update the maximum supply (owner only)
     */
    function setMaxSupply(uint256 _newMaxSupply) external onlyOwner {
        require(_newMaxSupply >= _currentTokenId - 1, "New max supply cannot be less than current supply");
        maxSupply = _newMaxSupply;
        emit MaxSupplyUpdated(_newMaxSupply);
    }

    /**
     * @dev Update the mint price (owner only)
     */
    function setMintPrice(uint256 _newMintPrice) external onlyOwner {
        mintPrice = _newMintPrice;
        emit MintPriceUpdated(_newMintPrice);
    }

    /**
     * @dev Update the maximum mint per address (owner only)
     */
    function setMaxMintPerAddress(uint256 _newMaxMintPerAddress) external onlyOwner {
        maxMintPerAddress = _newMaxMintPerAddress;
        emit MaxMintPerAddressUpdated(_newMaxMintPerAddress);
    }

    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Emergency withdraw of ERC20 tokens (owner only)
     */
    function withdrawToken(address _token) external onlyOwner {
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        token.transfer(owner(), balance);
    }
}
