// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OmenCompanyBadge
 * @notice Soulbound ERC-721 badge contract for the OMEN trust platform.
 * @dev Issues non-transferable NFTs to verified companies. Badges can be minted,
 * revoked (burned), or updated by the contract owner (admin/multi-sig).
 *
 * Note on OpenZeppelin v5.x:
 * - The deprecated `Counters` utility has been removed in v5.x. This contract uses
 *   a simple `uint256` counter instead.
 * - The `_beforeTokenTransfer` hook has been replaced by `_update` in v5.x. The
 *   soulbound restriction is enforced inside `_update`.
 */
contract OmenCompanyBadge is ERC721URIStorage, Ownable {
    // Counter for the next token ID to mint.
    uint256 private _tokenIdCounter;

    // Maps a company address to the first badge token ID it received.
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
        require(owner() == _msgSender(), "OmenBadge: caller is not the admin");
        _;
    }

    /**
     * @notice Deploy the badge contract.
     * @param initialOwner Address that will own the contract (admin or multi-sig).
     */
    constructor(address initialOwner) ERC721("OMEN Company Badge", "OMEN") Ownable(initialOwner) {
        _tokenIdCounter = 0;
    }

    /**
     * @notice Mint a soulbound badge to a verified company.
     * @param company Address that will receive the badge.
     * @param tokenURI IPFS or HTTP URI pointing to the badge metadata.
     * @dev Reverts if the company already holds a badge.
     */
    function mintBadge(address company, string memory tokenURI) public onlyAdmin {
        require(bytes(tokenURI).length > 0, "OmenBadge: tokenURI cannot be empty");
        require(company != address(0), "OmenBadge: cannot mint to zero address");
        require(balanceOf(company) == 0, "OmenBadge: company already holds a badge");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(company, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _companyToTokenId[company] = tokenId;

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
        require(_ownerOf(tokenId) != address(0), "OmenBadge: token does not exist");
        require(bytes(newURI).length > 0, "OmenBadge: newURI cannot be empty");

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
        require(hasValidBadge(company), "OmenBadge: company has no badge");
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
     * @notice Enforce the soulbound property.
     * @dev In OpenZeppelin v5.x, `_update` replaces `_beforeTokenTransfer`.
     *      Minting (`from == address(0)`) and burning (`to == address(0)`) are
     *      allowed; all other transfers are reverted.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != address(0) && to != address(0)) {
            revert("OmenBadge: Token is soulbound and cannot be transferred");
        }

        return from;
    }

    /**
     * @notice Block individual token approvals.
     * @dev Approvals are meaningless for a soulbound token; clearing is allowed.
     */
    function _approve(address to, uint256 tokenId, address auth, bool emitEvent) internal virtual override {
        if (to != address(0)) {
            revert("OmenBadge: approval not allowed for soulbound token");
        }
        super._approve(to, tokenId, auth, emitEvent);
    }

    /**
     * @notice Block operator approvals.
     * @dev Operators cannot be approved to transfer soulbound tokens.
     */
    function _setApprovalForAll(address badgeOwner, address operator, bool approved) internal virtual override {
        if (approved) {
            revert("OmenBadge: approval not allowed for soulbound token");
        }
        super._setApprovalForAll(badgeOwner, operator, approved);
    }
}
