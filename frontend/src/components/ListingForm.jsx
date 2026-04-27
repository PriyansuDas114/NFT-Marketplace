import { useState } from 'react';
import { ethers } from 'ethers';
import marketplaceAbi from '../abis/Marketplace.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const ListingForm = ({ nft, onSuccess }) => {
  const [price, setPrice]   = useState(nft?.price?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleList = async () => {
    if (!price || isNaN(price) || Number(price) <= 0) {
      setStatus({ type: 'error', msg: 'Enter a valid listing price.' });
      return;
    }
    setLoading(true);
    setStatus({ type: 'info', msg: 'Awaiting wallet confirmation…' });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, marketplaceAbi, signer);

      const tx = await contract.listNFT(nft.tokenId, ethers.parseEther(price));
      await tx.wait();

      setStatus({ type: 'success', msg: 'Listed successfully!' });
      onSuccess?.();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Transaction failed.' });
    }

    setLoading(false);
  };

  const statusColors = {
    success: { bg: 'var(--c-green-dim)',  color: 'var(--c-green)',  border: 'rgba(34,197,94,0.2)' },
    error:   { bg: 'var(--c-red-dim)',    color: 'var(--c-red)',    border: 'rgba(239,68,68,0.2)' },
    info:    { bg: 'var(--c-accent-dim)', color: 'var(--c-accent)', border: 'rgba(249,115,22,0.2)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="label">Listing Price (ETH)</label>
        <input
          type="number"
          className="input"
          placeholder="0.05"
          step="0.001"
          min="0"
          value={price}
          onChange={e => setPrice(e.target.value)}
          disabled={loading}
        />
      </div>

      {status && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--r-md)',
          fontSize: 13,
          fontWeight: 500,
          background: statusColors[status.type]?.bg,
          color:      statusColors[status.type]?.color,
          border:     `1px solid ${statusColors[status.type]?.border}`,
        }}>
          {status.msg}
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={handleList}
        disabled={loading || !nft}
      >
        {loading ? 'Listing…' : 'List for Sale'}
      </button>
    </div>
  );
};

export default ListingForm;
