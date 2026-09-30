import React, { useState } from 'react';
import { CheckCircle2, RefreshCw, Coins, ExternalLink } from 'lucide-react';
import { mintCompanyBadge } from '../services/api';
import { switchToAmoy, signWalletMessage, amoyTxUrl, amoyTokenUrl, toGatewayUrl } from '../services/blockchain';
import { useApp } from '../context/AppContext';

// Mint status panel for a registered company on /register.
//
// Eligibility is AUTHORITATIVE: the badge can be minted only after the
// admin flips the company to status === 'verified' (off-chain). The mint
// itself is a REAL Polygon Amoy transaction — the company's MetaMask wallet
// signs a message proving it controls the registered address; the backend
// admin signer submits and pays for the actual mint. Nothing is simulated:
// success is shown only after the backend confirms the receipt, and the
// panel renders the real tokenId / transaction hash / explorer links.
export default function CompanyMintPanel({ company, wallet, onBadgeMinted }) {
  const { showToast } = useApp();
  const [minting, setMinting] = useState(false);
  const [mintPhase, setMintPhase] = useState('idle'); // idle | signing | confirming
  const [mintedBadge, setMintedBadge] = useState(null);

  const adminVerified = company.status === 'verified';
  const registeredWallet = company.blockchain?.walletAddress;
  // Persisted badge fields are written ONLY after a confirmed transaction —
  // if they exist, the badge is real and must never be minted again.
  const existingBadge =
    company.blockchain?.tokenId && company.blockchain?.txHash
      ? {
          tokenId: company.blockchain.tokenId,
          transactionHash: company.blockchain.txHash,
          owner: registeredWallet
        }
      : null;
  const badge = mintedBadge || existingBadge;

  const handleMint = async () => {
    if (!wallet) {
      showToast('MetaMask is required to connect your company wallet.', 'warning');
      return;
    }
    if (!registeredWallet || wallet.address.toLowerCase() !== registeredWallet.toLowerCase()) {
      showToast(
        'Connected wallet does not match the registered company wallet. Reset and reconnect.',
        'error'
      );
      return;
    }

    setMinting(true);
    setMintPhase('signing');
    try {
      await switchToAmoy();
      const { message, signature } = await signWalletMessage(wallet.signer, company.name);
      // The backend submits the transaction and WAITS for the Amoy receipt
      // before responding — this phase label is accurate, not decorative.
      setMintPhase('confirming');
      const res = await mintCompanyBadge(company.id, {
        signature,
        message,
        walletAddress: registeredWallet
      });
      setMintedBadge(res.badge);
      onBadgeMinted?.(res.badge);
      showToast(
        res.alreadyMinted
          ? 'Badge already minted — showing the existing on-chain badge.'
          : 'FOCAL badge successfully minted on Polygon Amoy.',
        'success'
      );
    } catch (err) {
      // Surface the ACTUAL failure — signature rejection, wrong network,
      // missing contract/admin key configuration, RPC or gas errors.
      showToast(err.message || 'Company verified, but the blockchain badge could not be minted.', 'error');
    } finally {
      setMinting(false);
      setMintPhase('idle');
    }
  };

  // ---- VERIFIED + BADGE MINTED: show the real on-chain facts ----
  if (adminVerified && badge) {
    const txUrl = amoyTxUrl(badge.transactionHash);
    const tokenUrl = amoyTokenUrl(badge.tokenId);
    const metadataUrl = toGatewayUrl(company.blockchain?.tokenURI) || null;
    return (
      <div className="p-3 bg-neon-green/20 border-2 border-textDark space-y-2 text-xs">
        <div className="font-black uppercase text-textDark flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>FOCAL BADGE MINTED — ON-CHAIN CONFIRMED</span>
        </div>
        <div className="text-[11px] text-textDark space-y-1 font-bold font-mono">
          <div>
            TOKEN ID: <span className="font-black">#{badge.tokenId}</span>
          </div>
          <div className="break-all">
            WALLET: <span className="font-black">{badge.owner}</span>
          </div>
          <div className="break-all">
            TX HASH: <span className="font-black">{badge.transactionHash}</span>
          </div>
          <div>NETWORK: Polygon Amoy Testnet (CHAIN ID 80002)</div>
          <div className="flex flex-wrap gap-2 pt-1">
            {txUrl && (
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-neon-yellow border border-textDark font-black uppercase hover:bg-neon-green"
              >
                <ExternalLink className="w-3 h-3" /> VIEW TRANSACTION
              </a>
            )}
            {tokenUrl && (
              <a
                href={tokenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-pitch border border-textDark font-black uppercase hover:bg-neon-yellow"
              >
                <ExternalLink className="w-3 h-3" /> VIEW NFT
              </a>
            )}
            {metadataUrl && (
              <a
                href={metadataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-pitch border border-textDark font-black uppercase hover:bg-neon-yellow"
              >
                <ExternalLink className="w-3 h-3" /> TOKEN URI
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- NOT ADMIN-VERIFIED: mint is not available yet ----
  if (!adminVerified) {
    return (
      <div className="p-3 bg-pitch border border-borderDark text-xs text-textMuted font-bold space-y-1">
        <div className="font-black uppercase text-textDark">NFT BADGE</div>
        <p>NFT minting becomes available after administrator verification.</p>
      </div>
    );
  }

  // ---- VERIFIED (off-chain) + badge pending: offer the real mint ----
  return (
    <div className="p-3 bg-neon-yellow/20 border border-textDark space-y-2 text-xs">
      <div className="font-black uppercase text-textDark">NFT BADGE</div>
      <p className="text-textMuted font-bold">
        Your company is verified and eligible for a FOCAL trust badge. The badge is minted on
        Polygon Amoy to your connected wallet — the platform pays the gas.
      </p>
      <button
        type="button"
        onClick={handleMint}
        disabled={minting}
        className="w-full py-3 bg-neon-yellow border-2 border-textDark text-textDark font-black text-xs uppercase tracking-wider hover:bg-neon-green transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {minting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>
              {mintPhase === 'signing'
                ? 'MINTING BADGE — SIGN IN METAMASK...'
                : 'TRANSACTION SUBMITTED. WAITING FOR POLYGON AMOY CONFIRMATION...'}
            </span>
          </>
        ) : (
          <>
            <Coins className="w-4 h-4" />
            <span>MINT FOCAL BADGE</span>
          </>
        )}
      </button>
    </div>
  );
}