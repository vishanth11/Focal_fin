// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FocalAcademicCredential
 * @notice Academic Credential Registry & Verification Contract for FOCAL (AcadShield Module).
 * @dev Records immutable document hashes, institutional issuers, and status for academic credentials.
 */
contract FocalAcademicCredential is Ownable {
    enum CredentialStatus { Active, Revoked, Superseded }

    struct CredentialRecord {
        string credentialId;
        string documentHash;
        address studentWallet;
        address issuerUniversity;
        uint256 issuanceTimestamp;
        CredentialStatus status;
        string revocationReason;
        string supersededByCredentialId;
    }

    /// @notice Maps credentialId to its credential record.
    mapping(string => CredentialRecord) private _credentials;

    /// @notice Approved university issuers authorized to anchor credentials.
    mapping(address => bool) public approvedUniversities;

    event CredentialRegistered(
        string indexed credentialId,
        string documentHash,
        address indexed studentWallet,
        address indexed issuerUniversity,
        uint256 timestamp
    );

    event CredentialRevoked(
        string indexed credentialId,
        address indexed issuer,
        string reason,
        uint256 timestamp
    );

    event CredentialSuperseded(
        string indexed oldCredentialId,
        string indexed newCredentialId,
        address indexed issuer,
        string reason,
        uint256 timestamp
    );

    event UniversityAuthorized(address indexed university, bool authorized);

    modifier onlyAuthorizedIssuer() {
        require(
            owner() == _msgSender() || approvedUniversities[_msgSender()],
            "FocalAcademic: caller is not an authorized issuer"
        );
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setUniversityAuthorization(address university, bool authorized) external onlyOwner {
        require(university != address(0), "FocalAcademic: zero address");
        approvedUniversities[university] = authorized;
        emit UniversityAuthorized(university, authorized);
    }

    function registerCredential(
        string calldata credentialId,
        string calldata documentHash,
        address studentWallet
    ) external onlyAuthorizedIssuer {
        require(bytes(credentialId).length > 0, "FocalAcademic: empty credentialId");
        require(bytes(documentHash).length > 0, "FocalAcademic: empty documentHash");
        require(_credentials[credentialId].issuanceTimestamp == 0, "FocalAcademic: credential already registered");

        _credentials[credentialId] = CredentialRecord({
            credentialId: credentialId,
            documentHash: documentHash,
            studentWallet: studentWallet,
            issuerUniversity: _msgSender(),
            issuanceTimestamp: block.timestamp,
            status: CredentialStatus.Active,
            revocationReason: "",
            supersededByCredentialId: ""
        });

        emit CredentialRegistered(credentialId, documentHash, studentWallet, _msgSender(), block.timestamp);
    }

    function revokeCredential(string calldata credentialId, string calldata reason) external onlyAuthorizedIssuer {
        CredentialRecord storage record = _credentials[credentialId];
        require(record.issuanceTimestamp > 0, "FocalAcademic: credential not found");
        require(record.status == CredentialStatus.Active, "FocalAcademic: credential is not active");
        require(
            owner() == _msgSender() || record.issuerUniversity == _msgSender(),
            "FocalAcademic: not original issuer"
        );

        record.status = CredentialStatus.Revoked;
        record.revocationReason = reason;

        emit CredentialRevoked(credentialId, _msgSender(), reason, block.timestamp);
    }

    function supersedeCredential(
        string calldata oldCredentialId,
        string calldata newCredentialId,
        string calldata reason
    ) external onlyAuthorizedIssuer {
        CredentialRecord storage oldRecord = _credentials[oldCredentialId];
        require(oldRecord.issuanceTimestamp > 0, "FocalAcademic: old credential not found");
        require(oldRecord.status == CredentialStatus.Active, "FocalAcademic: old credential not active");
        require(
            owner() == _msgSender() || oldRecord.issuerUniversity == _msgSender(),
            "FocalAcademic: not original issuer"
        );

        oldRecord.status = CredentialStatus.Superseded;
        oldRecord.supersededByCredentialId = newCredentialId;

        emit CredentialSuperseded(oldCredentialId, newCredentialId, _msgSender(), reason, block.timestamp);
    }

    function getCredential(string calldata credentialId)
        external
        view
        returns (
            string memory docHash,
            address studentWallet,
            address issuerUniversity,
            uint256 issuanceTimestamp,
            CredentialStatus status,
            string memory revocationReason,
            string memory supersededBy
        )
    {
        CredentialRecord storage record = _credentials[credentialId];
        require(record.issuanceTimestamp > 0, "FocalAcademic: credential not found");
        return (
            record.documentHash,
            record.studentWallet,
            record.issuerUniversity,
            record.issuanceTimestamp,
            record.status,
            record.revocationReason,
            record.supersededByCredentialId
        );
    }

    function isValid(string calldata credentialId) external view returns (bool) {
        CredentialRecord storage record = _credentials[credentialId];
        return record.issuanceTimestamp > 0 && record.status == CredentialStatus.Active;
    }
}
