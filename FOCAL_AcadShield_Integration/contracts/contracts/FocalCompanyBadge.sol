// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FocalCompanyBadge
 * @notice Soulbound ERC-721 badge contract for the FOCAL trust platform.
 * @dev Issues non-transferable NFTs to verified companies. Badges can be minted,
 * revoked (burned), or updated by the contract owner (admin/multi-sig).
 *
 * This contract uses OpenZeppelin Contracts v5.x. The deprecated `Counters`
 * utility is replaced by a simple `uint256` counter, and the `_beforeTokenTransfer`
 * hook is replaced by the `_update` hook to enforce soulbound behavior.
 */
contract FocalCompanyBadge is ERC721URIStorage, Ownable {
    /// @notice Counter for the next token ID to mint.
    uint256 private _tokenIdCounter;

    /// @notice Maps a company address to the first badge token ID it received.
    mapping(address => uint256) private _companyToTokenId;

    /**
     * @notice Emitted when a new badge is minted for a company.
     * @param company Address that received the badge.
     * @param tokenId ID of the minted token.
     * @param tokenURI URI pointing to the off-chain metadata.
     */
    event BadgeMinted(address indexed company, uint256 indexed tokenId, string tokenURI);

    /**
     * @notice Emitted when a badge is revoked (burned).
     * @param company Address that owned the revoked badge.
     * @param tokenId ID of the revoked token.
     */
    event BadgeRevoked(address indexed company, uint256 indexed tokenId);

    /**
     * @notice Emitted when a badge's token URI is updated.
     * @param tokenId ID of the updated token.
     * @param newURI New metadata URI.
     */
    event BadgeUpdated(uint256 indexed tokenId, string newURI);

    /**
     * @notice Restricts a function to the contract owner.
     * @dev In a production deployment the owner should be a multi-sig wallet.
     */
    modifier onlyAdmin() {
        require(owner() == _msgSender(), "FocalBadge: caller is not the admin");
        _;
    }

    /**
     * @notice Deploy the badge contract.
     * @param initialOwner Address that will own the contract (admin or multi-sig).
     */
    constructor(address initialOwner) ERC721("FOCAL Company Badge", "FOCAL") Ownable(initialOwner) {
        _tokenIdCounter = 0;
    }

    /**
     * @notice Mint a soulbound badge to a verified company.
     * @param company Address that will receive the badge.
     * @param tokenURI IPFS or HTTP URI pointing to the badge metadata.
     * @dev Reverts if the company already holds a badge. State is set before
     *      `_safeMint` so that any `onERC721Received` callback observes a
     *      consistent view of the badge.
     */
    function mintBadge(address company, string memory tokenURI) public onlyAdmin {
        require(bytes(tokenURI).length > 0, "FocalBadge: tokenURI cannot be empty");
        require(company != address(0), "FocalBadge: cannot mint to zero address");
        require(balanceOf(company) == 0, "FocalBadge: company already holds a badge");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Set all internal state before the optional external callback in `_safeMint`.
        _companyToTokenId[company] = tokenId;
        _setTokenURI(tokenId, tokenURI);
        _safeMint(company, tokenId);

        emit BadgeMinted(company, tokenId, tokenURI);
    }

    /**
     * @notice Revoke a badge by burning it.
     * @param tokenId ID of the badge to revoke.
     * @dev Only the admin can call. Emits BadgeRevoked.
     */
    function revokeBadge(uint256 tokenId) public onlyAdmin {
        address company = ownerOf(tokenId);
        _burn(tokenId);
        delete _companyToTokenId[company];

        emit BadgeRevoked(company, tokenId);
    }

    /**
     * @notice Update the metadata URI of an existing badge.
     * @param tokenId ID of the badge to update.
     * @param newURI New metadata URI (e.g. revoked metadata).
     * @dev Only the admin can call. Emits BadgeUpdated.
     */
    function updateBadgeURI(uint256 tokenId, string memory newURI) public onlyAdmin {
        require(_ownerOf(tokenId) != address(0), "FocalBadge: token does not exist");
        require(bytes(newURI).length > 0, "FocalBadge: newURI cannot be empty");

        _setTokenURI(tokenId, newURI);

        emit BadgeUpdated(tokenId, newURI);
    }

    /**
     * @notice Check whether a company holds a valid badge.
     * @param company Address to check.
     * @return true if the address holds at least one badge.
     */
    function hasValidBadge(address company) public view returns (bool) {
        return balanceOf(company) > 0;
    }

    /**
     * @notice Get the token ID associated with a company address.
     * @param company Address to query.
     * @return tokenId The first badge token ID held by the company.
     * @dev Reverts if the address holds no badge.
     */
    function getBadgeId(address company) public view returns (uint256) {
        require(hasValidBadge(company), "FocalBadge: company has no badge");
        return _companyToTokenId[company];
    }

    /**
     * @notice Get the owner address of a given token ID.
     * @param tokenId ID of the badge.
     * @return company Address that currently owns the token.
     */
    function getCompanyByTokenId(uint256 tokenId) public view returns (address) {
        return ownerOf(tokenId);
    }

    /**
     * @notice Prevent the contract from being left without an owner.
     * @dev Renouncing ownership would brick all admin-only functions.
     *      Ownership can still be transferred via `transferOwnership`.
     */
    function renounceOwnership() public view override onlyOwner {
        revert("FocalBadge: ownership cannot be renounced");
    }

    /**
     * @notice Enforce the soulbound property.
     * @dev In OpenZeppelin v5.x, `_update` replaces `_beforeTokenTransfer`.
     *      Minting (`from == address(0)`) and burning (`to == address(0)`) are
     *      allowed; all other transfers are reverted.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != address(0) && to != address(0)) {
            revert("FocalBadge: Token is soulbound and cannot be transferred");
        }

        return from;
    }

    /**
     * @notice Block individual token approvals.
     * @dev Approvals are meaningless for a soulbound token; clearing is allowed.
     */
    function _approve(address to, uint256 tokenId, address auth, bool emitEvent) internal virtual override {
        if (to != address(0)) {
            revert("FocalBadge: approval not allowed for soulbound token");
        }
        super._approve(to, tokenId, auth, emitEvent);
    }

    /**
     * @notice Block operator approvals.
     * @dev Operators cannot be approved to transfer soulbound tokens.
     */
    function _setApprovalForAll(address badgeOwner, address operator, bool approved) internal virtual override {
        if (approved) {
            revert("FocalBadge: approval not allowed for soulbound token");
        }
        super._setApprovalForAll(badgeOwner, operator, approved);
    }
}
