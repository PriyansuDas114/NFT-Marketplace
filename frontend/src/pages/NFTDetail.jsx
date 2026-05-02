import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNFTContract } from '../hooks/useNFTContract';
import { useWallet } from '../context/WalletContext';
import { SkeletonCard } from '../components/Spinner';
import './NFTDetail.css';

const EthIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
  </svg>
);

const NFTDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useWallet();
  const { buyNFT } = useNFTContract();

  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [ethUsdRate, setEthUsdRate] = useState(3241);

  // Fetch ETH/USD rate
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const res = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        setEthUsdRate(res.data.ethereum.usd);
      } catch (err) {
        console.warn('Failed to fetch ETH rate:', err);
      }
    };
    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch NFT details
  useEffect(() => {
    const fetchNFT = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/nfts/${id}`);
        setNft(res.data);
      } catch (err) {
        console.error('Failed to fetch NFT:', err);
        setError(err.response?.data?.message || 'NFT not found');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchNFT();
  }, [id]);

  const handleBuy = async () => {
    if (!account || !nft) return;
    try {
      setTxStatus('pending');
      setTxHash(null);
      
      const receipt = await buyNFT(nft.listingId, nft.price);
      setTxHash(receipt?.transactionHash);

      // Sync with backend
      try {
        await axios.post('/api/nfts/buy', {
          tokenId: nft.tokenId,
          listingId: nft.listingId,
          newOwner: account,
          txHash: receipt.transactionHash,
        });
      } catch (err) {
        console.warn('Backend sync failed:', err);
      }

      setTxStatus('success');
      setTimeout(() => navigate('/gallery'), 2000);
    } catch (err) {
      console.error('Buy failed:', err);
      setTxStatus('error');
      setTimeout(() => setTxStatus(null), 3000);
    }
  };

  if (loading) return <div className="nft-detail"><SkeletonCard /></div>;
  if (error) return <div className="nft-detail"><div className="error-message">{error}</div></div>;
  if (!nft) return <div className="nft-detail"><div className="error-message">NFT not found</div></div>;

  const imageSrc = nft?.image || nft?.imageUrl || nft?.ipfsUrl;
  const usdPrice = nft?.price && ethUsdRate
    ? (parseFloat(nft.price) * ethUsdRate).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : null;

  const fallbackTraitsByCategory = {
    Music: [
      { t: 'BPM', v: '128' },
      { t: 'Key', v: 'F Minor' },
      { t: 'Duration', v: '3:14' },
      { t: 'Edition', v: '1/7' },
    ],
    Gaming: [
      { t: 'Class', v: 'Racer' },
      { t: 'Tier', v: 'Epic' },
      { t: 'Engine', v: 'V9' },
      { t: 'Edition', v: '1/50' },
    ],
    Art: [
      { t: 'Style', v: 'Abstract' },
      { t: 'Palette', v: 'Neon' },
      { t: 'Mood', v: 'Dreamy' },
      { t: 'Edition', v: '1/25' },
    ],
    Domains: [
      { t: 'Length', v: '4 chars' },
      { t: 'Extension', v: '.xyz' },
      { t: 'Type', v: 'Web3' },
      { t: 'Edition', v: 'Unique' },
    ],
    Sports: [
      { t: 'League', v: 'Pro' },
      { t: 'Season', v: '2026' },
      { t: 'Type', v: 'Moment' },
      { t: 'Edition', v: '1/100' },
    ],
  };

  const traits = Array.isArray(nft?.traits) && nft.traits.length
    ? nft.traits.map((x) => ({ t: x.t || x.type || 'Trait', v: x.v || x.value || '-' }))
    : (fallbackTraitsByCategory[nft?.category] || []);

  return (
    <div className="nft-detail">
      <button className="nft-detail-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="nft-detail-container">
        <div className="nft-detail-image-wrap">
          {imageSrc ? (
            <img src={imageSrc} alt={nft?.name || 'NFT'} className="nft-detail-image" />
          ) : (
            <div className="nft-detail-image-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        <div className="nft-detail-content">
          <div className="nft-detail-header">
            <div>
              <div className="nft-detail-collection">{nft?.collection || ''}</div>
              <h1 className="nft-detail-name">{nft?.name || ''}</h1>
              <div className="nft-detail-meta-row">
                {nft?.category && <span className="badge badge-accent">{nft.category}</span>}
                {nft?.tokenId && <span className="nft-detail-token-id">Token #{nft.tokenId}</span>}
              </div>
            </div>
          </div>

          {nft?.description && <p className="nft-detail-description">{nft.description}</p>}

          {traits.length > 0 && (
            <div className="nft-detail-traits">
              <h3>Attributes</h3>
              <div className="traits-grid">
                {traits.map((trait, idx) => (
                  <div className="trait-card" key={`${trait.t}-${idx}`}>
                    <div className="trait-type">{trait.t}</div>
                    <div className="trait-val">{trait.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="nft-detail-price-section">
            <div>
              <div className="nft-detail-price-label">Current Price</div>
              <div className="nft-detail-price-val">
                <EthIcon /> {nft?.price || '0.00'} ETH
              </div>
              {usdPrice && <div className="nft-detail-price-usd">≈ ${usdPrice}</div>}
            </div>
            {nft?.owner && (
              <div>
                <div className="nft-detail-price-label">Seller</div>
                <div className="nft-detail-seller">{nft.owner}</div>
              </div>
            )}
          </div>

          {/* Transaction Status */}
          {txStatus && (
            <div className={`tx-status tx-status-${txStatus}`}>
              {txStatus === 'pending' && (
                <>
                  <div className="tx-spinner"></div>
                  <span>Transaction pending...</span>
                </>
              )}
              {txStatus === 'success' && (
                <>
                  <span>✓ Purchase successful! Redirecting...</span>
                  {txHash && (
                    <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="tx-hash-link">
                      View on Etherscan
                    </a>
                  )}
                </>
              )}
              {txStatus === 'error' && <span>✕ Transaction failed. Please try again.</span>}
            </div>
          )}

          <div className="nft-detail-actions">
            {nft?.listed ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={handleBuy}
                  disabled={!account || txStatus === 'pending'}
                >
                  {!account ? 'Connect Wallet to Buy' : txStatus === 'pending' ? 'Processing...' : 'Buy Now'}
                </button>
                <button className="btn btn-secondary">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1l2.4 5.1L16 6.8l-4 3.9 1 5.8L8 13.1l-5 2.4 1-5.8L0 6.8l5.6-.7L8 1z" />
                  </svg>
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" disabled>
                Not for Sale
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetail;
