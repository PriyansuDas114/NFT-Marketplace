// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ╔═══════════════════════════════════════════════════════════╗
 * ║                    NexMint NFT.sol                        ║
 * ║  ERC721 + ERC2981 royalties + minting fee + supply cap   ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Improvements over original:
 *  [1] ERC2981 royalty standard — creator earns % on every resale
 *  [2] Minting fee — prevents spam minting, generates protocol revenue
 *  [3] Max supply cap — preserves collection scarcity
 *  [4] Per-wallet mint limit — prevents single-address hoarding
 *  [5] Pause mechanism — emergency stop via Pausable
 *  [6] tokenCounter starts at 1 (token 0 reserved / unambiguous)
 *  [7] withdrawMintFees() — owner can claim accumulated fees safely
 *  [8] Proper supportsInterface override merging ERC721 + ERC2981
 */

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFT is
    ERC721URIStorage,
    ERC721Enumerable,
    ERC2981,
    Ownable,
    Pausable,
    ReentrancyGuard
{
    // ─── State ────────────────────────────────────────────────

    /// @notice Running counter; first token is ID 1
    uint256 public tokenCounter;

    /// @notice ETH required to mint one NFT (default 0 = free)
    uint256 public mintingFee;

    /// @notice Hard cap on total supply (0 = unlimited)
    uint256 public maxSupply;

    /// @notice Maximum tokens any single address may mint (0 = unlimited)
    uint256 public maxPerWallet;

    /// @notice How many tokens each address has minted
    mapping(address => uint256) public mintedPerWallet;

    // ─── Events ───────────────────────────────────────────────

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event MintingFeeUpdated(uint256 oldFee, uint256 newFee);
    event RoyaltyUpdated(address indexed receiver, uint96 feeBps);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────

    error InsufficientMintFee(uint256 required, uint256 sent);
    error MaxSupplyReached(uint256 maxSupply);
    error WalletMintLimitReached(address wallet, uint256 limit);
    error EmptyTokenURI();
    error NoFeesToWithdraw();
    error ZeroAddress();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────

    /**
     * @param _name          ERC721 collection name
     * @param _symbol        ERC721 token symbol
     * @param _royaltyBps    Creator royalty in basis points (e.g. 500 = 5%)
     * @param _mintingFee    ETH cost per mint in wei (0 = free)
     * @param _maxSupply     Maximum total tokens (0 = unlimited)
     * @param _maxPerWallet  Max tokens per address (0 = unlimited)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint96  _royaltyBps,
        uint256 _mintingFee,
        uint256 _maxSupply,
        uint256 _maxPerWallet
    )
        ERC721(_name, _symbol)
        Ownable(msg.sender)
    {
        require(_royaltyBps <= 1000, "NFT: royalty cannot exceed 10%");

        mintingFee    = _mintingFee;
        maxSupply     = _maxSupply;
        maxPerWallet  = _maxPerWallet;
        tokenCounter  = 1; // start at 1 — token 0 is never minted

        // Set default royalty: deployer is creator, feeBps applied on all tokens
        _setDefaultRoyalty(msg.sender, _royaltyBps);
    }

    // ─── Minting ──────────────────────────────────────────────

    /**
     * @notice Mint a new NFT to the caller.
     * @param  _tokenURI  IPFS metadata URI (ipfs://... or https://...)
     * @return tokenId    The ID of the newly minted token
     */
    function mintNFT(string calldata _tokenURI)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 tokenId)
    {
        // [1] Validate URI is not empty
        if (bytes(_tokenURI).length == 0) revert EmptyTokenURI();

        // [2] Enforce minting fee
        if (msg.value < mintingFee)
            revert InsufficientMintFee(mintingFee, msg.value);

        // [3] Enforce max supply
        if (maxSupply > 0 && tokenCounter > maxSupply)
            revert MaxSupplyReached(maxSupply);

        // [4] Enforce per-wallet limit
        if (maxPerWallet > 0 && mintedPerWallet[msg.sender] >= maxPerWallet)
            revert WalletMintLimitReached(msg.sender, maxPerWallet);

        tokenId = tokenCounter;
        tokenCounter++;
        mintedPerWallet[msg.sender]++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        // Refund any excess ETH sent
        if (msg.value > mintingFee) {
            uint256 excess = msg.value - mintingFee;
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            if (!ok) revert TransferFailed();
        }

        emit NFTMinted(msg.sender, tokenId, _tokenURI);
    }

    // ─── Owner Controls ───────────────────────────────────────

    /**
     * @notice Update the per-mint fee. Emits MintingFeeUpdated.
     */
    function setMintingFee(uint256 _newFee) external onlyOwner {
        emit MintingFeeUpdated(mintingFee, _newFee);
        mintingFee = _newFee;
    }

    /**
     * @notice Update the default royalty for all tokens.
     * @param  _receiver  Address that receives royalties
     * @param  _feeBps    Royalty in basis points (max 1000 = 10%)
     */
    function setRoyalty(address _receiver, uint96 _feeBps) external onlyOwner {
        if (_receiver == address(0)) revert ZeroAddress();
        require(_feeBps <= 1000, "NFT: royalty cannot exceed 10%");
        _setDefaultRoyalty(_receiver, _feeBps);
        emit RoyaltyUpdated(_receiver, _feeBps);
    }

    /**
     * @notice Override royalty for a specific token ID.
     */
    function setTokenRoyalty(
        uint256 _tokenId,
        address _receiver,
        uint96  _feeBps
    ) external onlyOwner {
        if (_receiver == address(0)) revert ZeroAddress();
        require(_feeBps <= 1000, "NFT: royalty cannot exceed 10%");
        _setTokenRoyalty(_tokenId, _receiver, _feeBps);
    }

    /**
     * @notice Withdraw accumulated minting fees to owner.
     *         Uses call{value} instead of transfer() for contract-wallet safety.
     */
    function withdrawMintFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFeesToWithdraw();
        (bool ok, ) = payable(owner()).call{value: balance}("");
        if (!ok) revert TransferFailed();
        emit FeesWithdrawn(owner(), balance);
    }

    /**
     * @notice Pause all minting. Emergency stop.
     */
    function pause()   external onlyOwner { _pause(); }

    /**
     * @notice Unpause minting.
     */
    function unpause() external onlyOwner { _unpause(); }

    // ─── Overrides (multiple inheritance) ────────────────────

    /**
     * ERC721URIStorage + ERC721Enumerable both override _update and
     * tokenURI — we must explicitly resolve the diamond.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Declare support for ERC721, ERC721Enumerable, ERC2981.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
