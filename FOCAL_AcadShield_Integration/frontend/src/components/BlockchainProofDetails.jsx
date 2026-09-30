import React from 'react';
import { toGatewayUrl } from '../services/blockchain';

export default function BlockchainProofDetails({ proof }) {
  if (!proof?.isValid) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-borderDark pt-3 text-[10px] font-bold">
      {proof.metadata?.image && (
        <img
          src={toGatewayUrl(proof.metadata.image)}
          alt={`${proof.companyName || 'Company'} OMEN badge`}
          className="h-20 w-20 border border-borderDark object-contain bg-white"
        />
      )}
      <div className="grid gap-1">
        <span>COMPANY: {proof.companyName || '—'}</span>
        <span>DOMAIN: {proof.domain || '—'}</span>
        <span>VERIFICATION DATE: {proof.verificationDate || '—'}</span>
        <span>STATUS: {proof.status || '—'}</span>
        <span className="break-all">HASH: {proof.verificationHash || '—'}</span>
        <span className="break-all">TOKEN URI: {proof.tokenURI}</span>
      </div>
    </div>
  );
}