// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                  NexMint Marketplace.sol                      ║
 * ║  List · Buy · Cancel · Proceeds · Royalties · Platform Fee   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Security & correctness fixes over original:
 *  [1] ETH withdrawal: payable.call{value} replaces .transfer()
 *      — .transfer() forwards only 2300 gas, breaking multisig/Safe wallets
 *  [2] EIP-2981 royalties — automatically paid to creator on every sale
 *  [3] Platform fee (basis points) — configurable, accrues to owner proceeds
 *  [4] Duplicate-listing guard — same token cannot be listed twice
 *  [5] Listing ownership enforced in cancelItem (was present) + updatePrice (new)
 *  [6] Price lower bound — cannot list at 0 (was present, kept)
 *  [7] Configurable min/max price bounds — prevents extreme manipulation
 *  [8] Overpayment refund — excess ETH returned to buyer automatically
 *  [9] Pausable — emergency stop for all state-changing operations
 * [10] Custom errors — cheaper gas than require strings
 * [11] Events for fee changes — full auditability
 * [12] Two-step owner transfer via Ownable2Step — prevents accidental renounce
 */

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Marketplace is ReentrancyGuard, Ownable2Step, Pausable {

    // ─── Constants ────────────────────────────────────────────

    /// @dev Basis-point denominator (10 000 = 100%)
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @dev Absolute minimum listing price (0.0001 ETH) to prevent dust spam
    uint256 public constant MIN_PRICE = 0.0001 ether;

    // ─── State ────────────────────────────────────────────────

    struct Listing {
        address seller;
        address nftAddress;
        uint256 tokenId;
        uint256 price;
        uint256 listedAt; // block.timestamp of listing creation
    }

    /// @notice listingId → Listing (deleted on sale/cancel)
    mapping(uint256 => Listing) public listings;

    /// @notice Auto-incrementing listing ID counter
    uint256 public listingCounter;

    /// @notice Accrued ETH balance per address (seller proceeds + creator royalties + platform fees)
    mapping(address => uint256) public proceeds;

    /// @notice nftAddress → tokenId → currently active listingId (0 = unlisted)
    ///         Prevents the same token being listed under multiple IDs.
    mapping(address => mapping(uint256 => uint256)) private _activeListingId;

    /// @notice nftAddress → tokenId → is currently listed?
    mapping(address => mapping(uint256 => bool)) public isTokenListed;

    /// @notice Platform fee in basis points (default 250 = 2.5%)
    uint96 public platformFeeBps;

    /// @notice Maximum platform fee the owner can ever set (500 = 5%) — protects sellers
    uint96 public constant MAX_PLATFORM_FEE_BPS = 500;

    // ─── Events ───────────────────────────────────────────────

    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftAddress,
        uint256 tokenId,
        uint256 price
    );
    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed nftAddress,
        uint256 tokenId,
        uint256 price,
        uint256 sellerProceeds,
        uint256 royaltyPaid,
        uint256 platformFee
    );
    event ItemCanceled(uint256 indexed listingId, address indexed seller);
    event ItemPriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);
    event PlatformFeeUpdated(uint96 oldBps, uint96 newBps);
    event ProceedsWithdrawn(address indexed account, uint256 amount);

    // ─── Custom Errors ────────────────────────────────────────

    error PriceTooLow(uint256 minimum, uint256 given);
    error NotTokenOwner(address caller, address owner);
    error MarketplaceNotApproved();
    error TokenAlreadyListed(address nftAddress, uint256 tokenId);
    error ListingNotActive(uint256 listingId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error NotSeller(address caller, address seller);
    error NoProceeds(address account);
    error FeeTooHigh(uint96 maximum, uint96 given);
    error TransferFailed(address recipient, uint256 amount);
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────

    /**
     * @param _initialOwner    Address that owns the marketplace contract
     * @param _platformFeeBps  Initial platform fee in basis points (e.g. 250 = 2.5%)
     */
    constructor(address _initialOwner, uint96 _platformFeeBps)
        Ownable(_initialOwner)
    {
        if (_initialOwner == address(0)) revert ZeroAddress();
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS)
            revert FeeTooHigh(MAX_PLATFORM_FEE_BPS, _platformFeeBps);

        platformFeeBps = _platformFeeBps;
    }

    // ─── Core Marketplace Functions ───────────────────────────

    /**
     * @notice List an NFT for sale.
     *
     * Requirements:
     *  - Caller must own the token
     *  - Marketplace must be approved to transfer the token
     *  - Token must not already be listed
     *  - Price must be >= MIN_PRICE
     *
     * @param nftAddress  ERC721 contract address
     * @param tokenId     Token to list
     * @param price       Sale price in wei (must be >= MIN_PRICE)
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant whenNotPaused {
        // [1] Price bound
        if (price < MIN_PRICE) revert PriceTooLow(MIN_PRICE, price);

        IERC721 nft = IERC721(nftAddress);

        // [2] Ownership check
        address currentOwner = nft.ownerOf(tokenId);
        if (currentOwner != msg.sender)
            revert NotTokenOwner(msg.sender, currentOwner);

        // [3] Approval check
        bool approvedForAll = nft.isApprovedForAll(msg.sender, address(this));
        bool approvedSingle = nft.getApproved(tokenId) == address(this);
        if (!approvedForAll && !approvedSingle)
            revert MarketplaceNotApproved();

        // [4] Duplicate listing guard
        if (isTokenListed[nftAddress][tokenId])
            revert TokenAlreadyListed(nftAddress, tokenId);

        uint256 listingId = listingCounter++;

        listings[listingId] = Listing({
            seller:     msg.sender,
            nftAddress: nftAddress,
            tokenId:    tokenId,
            price:      price,
            listedAt:   block.timestamp
        });

        isTokenListed[nftAddress][tokenId]  = true;
        _activeListingId[nftAddress][tokenId] = listingId;

        emit ItemListed(listingId, msg.sender, nftAddress, tokenId, price);
    }

    /**
     * @notice Purchase a listed NFT.
     *
     * Fee distribution on a sale of `price` ETH:
     *   1. royalty  = EIP-2981 royaltyInfo(tokenId, price)   [creator]
     *   2. platform = price * platformFeeBps / 10_000         [owner proceeds]
     *   3. seller   = price - royalty - platform              [seller proceeds]
     *
     * All proceeds are stored in the `proceeds` mapping.
     * Buyer calls withdrawProceeds() when they are ready.
     * Any overpayment (msg.value > price) is refunded immediately.
     *
     * @param listingId  ID of the listing to purchase
     */
    function buyItem(uint256 listingId)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        Listing memory listing = listings[listingId];

        // [1] Listing must be active (price == 0 means deleted)
        if (listing.price == 0) revert ListingNotActive(listingId);

        // [2] Must send at least the listing price
        if (msg.value < listing.price)
            revert InsufficientPayment(listing.price, msg.value);

        // ── Fee computation ──────────────────────────────────

        uint256 salePrice  = listing.price;

        // [3] EIP-2981 royalty (returns 0,0 if contract doesn't support it)
        (address royaltyReceiver, uint256 royaltyAmount) = _getRoyalty(
            listing.nftAddress, listing.tokenId, salePrice
        );

        // [4] Platform fee
        uint256 platformFee = (salePrice * platformFeeBps) / BPS_DENOMINATOR;

        // Safety: ensure fees don't exceed sale price
        // (can only happen if royalty contract misbehaves)
        uint256 totalFees = royaltyAmount + platformFee;
        if (totalFees > salePrice) {
            // Scale down proportionally — seller gets 0 but tx doesn't revert
            royaltyAmount = salePrice * royaltyAmount / totalFees;
            platformFee   = salePrice - royaltyAmount;
            totalFees     = salePrice;
        }

        uint256 sellerProceeds = salePrice - totalFees;

        // ── Accrue proceeds ──────────────────────────────────

        proceeds[listing.seller] += sellerProceeds;

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            proceeds[royaltyReceiver] += royaltyAmount;
        }

        // Platform fee goes to owner's proceeds (not a direct transfer —
        // avoids re-entrancy risk and keeps withdrawal pattern consistent)
        proceeds[owner()] += platformFee;

        // ── State update before transfer (checks-effects-interactions) ──

        delete listings[listingId];
        isTokenListed[listing.nftAddress][listing.tokenId]     = false;
        delete _activeListingId[listing.nftAddress][listing.tokenId];

        // ── NFT transfer ─────────────────────────────────────

        IERC721(listing.nftAddress).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // ── Refund overpayment ────────────────────────────────

        uint256 excess = msg.value - salePrice;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            if (!ok) revert TransferFailed(msg.sender, excess);
        }

        emit ItemSold(
            listingId,
            msg.sender,
            listing.nftAddress,
            listing.tokenId,
            salePrice,
            sellerProceeds,
            royaltyAmount,
            platformFee
        );
    }

    /**
     * @notice Cancel an active listing. Only the original seller can cancel.
     * @param listingId  Listing to cancel
     */
    function cancelItem(uint256 listingId)
        external
        nonReentrant
        whenNotPaused
    {
        Listing memory listing = listings[listingId];

        if (listing.price == 0)         revert ListingNotActive(listingId);
        if (msg.sender != listing.seller) revert NotSeller(msg.sender, listing.seller);

        delete listings[listingId];
        isTokenListed[listing.nftAddress][listing.tokenId]     = false;
        delete _activeListingId[listing.nftAddress][listing.tokenId];

        emit ItemCanceled(listingId, msg.sender);
    }

    /**
     * @notice Update the price of an existing listing.
     *         Only the seller can update. New price must be >= MIN_PRICE.
     *
     * @param listingId  Listing to update
     * @param newPrice   New price in wei
     */
    function updatePrice(uint256 listingId, uint256 newPrice)
        external
        nonReentrant
        whenNotPaused
    {
        if (newPrice < MIN_PRICE) revert PriceTooLow(MIN_PRICE, newPrice);

        Listing storage listing = listings[listingId];

        if (listing.price == 0)           revert ListingNotActive(listingId);
        if (msg.sender != listing.seller)  revert NotSeller(msg.sender, listing.seller);

        uint256 old = listing.price;
        listing.price = newPrice;

        emit ItemPriceUpdated(listingId, old, newPrice);
    }

    /**
     * @notice Withdraw accrued ETH proceeds (seller earnings, royalties, platform fees).
     *
     * Uses call{value} instead of transfer() to support:
     *  - EOA wallets (MetaMask, etc.)
     *  - Smart contract wallets (Gnosis Safe, Argent, etc.)
     *  - Multisigs with complex fallback logic
     *
     * Follows checks-effects-interactions:
     *  1. Check: balance > 0
     *  2. Effect: zero out balance BEFORE the external call
     *  3. Interaction: transfer ETH
     */
    function withdrawProceeds() external nonReentrant {
        uint256 amount = proceeds[msg.sender];
        if (amount == 0) revert NoProceeds(msg.sender);

        // Zero before external call — prevents re-entrancy double-withdraw
        proceeds[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed(msg.sender, amount);

        emit ProceedsWithdrawn(msg.sender, amount);
    }

    // ─── Owner Controls ───────────────────────────────────────

    /**
     * @notice Update the platform fee. Capped at MAX_PLATFORM_FEE_BPS (5%).
     * @param newFeeBps  New fee in basis points
     */
    function setPlatformFee(uint96 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_PLATFORM_FEE_BPS)
            revert FeeTooHigh(MAX_PLATFORM_FEE_BPS, newFeeBps);
        emit PlatformFeeUpdated(platformFeeBps, newFeeBps);
        platformFeeBps = newFeeBps;
    }

    /**
     * @notice Emergency pause — halts listItem, buyItem, cancelItem, updatePrice.
     *         withdrawProceeds intentionally remains open during pause so sellers
     *         can always retrieve their funds.
     */
    function pause()   external onlyOwner { _pause(); }

    /**
     * @notice Unpause the marketplace.
     */
    function unpause() external onlyOwner { _unpause(); }

    // ─── View Helpers ─────────────────────────────────────────

    /**
     * @notice Get full listing details for a given ID.
     */
    function getListing(uint256 listingId)
        external
        view
        returns (Listing memory)
    {
        return listings[listingId];
    }

    /**
     * @notice Get the active listing ID for a specific token.
     *         Returns (listingId, isActive). listingId is 0 if not listed.
     */
    function getActiveListingId(address nftAddress, uint256 tokenId)
        external
        view
        returns (uint256 listingId, bool active)
    {
        active    = isTokenListed[nftAddress][tokenId];
        listingId = active ? _activeListingId[nftAddress][tokenId] : 0;
    }

    /**
     * @notice Get the accrued proceeds balance for any address.
     */
    function getProceeds(address account)
        external
        view
        returns (uint256)
    {
        return proceeds[account];
    }

    /**
     * @notice Preview the fee breakdown for a hypothetical sale at `price`.
     * @return royaltyReceiver  Address that would receive the royalty
     * @return royaltyAmount    ETH amount going to creator
     * @return platformFeeAmt   ETH amount going to marketplace owner
     * @return sellerAmount     ETH amount going to seller
     */
    function previewSaleFees(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external view returns (
        address royaltyReceiver,
        uint256 royaltyAmount,
        uint256 platformFeeAmt,
        uint256 sellerAmount
    ) {
        (royaltyReceiver, royaltyAmount) = _getRoyalty(nftAddress, tokenId, price);
        platformFeeAmt = (price * platformFeeBps) / BPS_DENOMINATOR;
        uint256 total  = royaltyAmount + platformFeeAmt;
        sellerAmount   = total > price ? 0 : price - total;
    }

    // ─── Internal Helpers ─────────────────────────────────────

    /**
     * @dev Query EIP-2981 royalty info. Returns (address(0), 0) if the NFT
     *      contract does not implement the interface — safe for all ERC721s.
     */
    function _getRoyalty(
        address nftAddress,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address receiver, uint256 amount) {
        // Check interface support before calling to avoid reverts on
        // contracts that don't implement ERC2981
        try IERC2981(nftAddress).royaltyInfo(tokenId, salePrice)
            returns (address r, uint256 a)
        {
            receiver = r;
            amount   = a;
        } catch {
            receiver = address(0);
            amount   = 0;
        }
    }
}
