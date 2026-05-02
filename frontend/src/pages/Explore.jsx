import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import NFTCard from '../components/NFTCard';
import { SkeletonCard } from '../components/Spinner';
import { useNFTContract } from '../hooks/useNFTContract';
import { useWallet } from '../context/WalletContext';
import { sampleNFTs } from '../data/sampleNFTs';
import './Explore.css';

const CATEGORIES = ['All', 'Art', 'Gaming', 'Music', 'Domains', 'Sports'];
const SORT_OPTIONS = ['Newest first', 'Price: Low → High', 'Price: High → Low', 'Most liked'];

const EmptyIcon = () => (
  <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

// ────────────────────────────────────────────────────────────
//  DetailPanel with integrated buy flow
// ────────────────────────────────────────────────────────────
const DetailPanel = ({ nft, isOpen, onClose, ethUsdRate, onBuy }) => {
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const EthIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
    </svg>
  );

  const handleBuyClick = async () => {
    if (!nft || !onBuy) return;
    try {
      setTxStatus('pending');
      setTxHash(null);
      const receipt = await onBuy(nft);
      setTxHash(receipt?.transactionHash);
      setTxStatus('success');
    } catch (err) {
      console.error('Buy failed:', err);
      setTxStatus('error');
      setTimeout(() => setTxStatus(null), 3000);
    }
  };

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

  const panelUi = (
    <>
      <div className={`detail-backdrop${isOpen ? ' open' : ''}`} onClick={onClose}></div>
      <div className={`detail-panel${isOpen ? ' open' : ''}`}>
        <button className="detail-close" onClick={onClose}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1L13 13M13 1L1 13" strokeLinecap="round" />
          </svg>
        </button>

        <div className="detail-image-wrap">
          {imageSrc ? (
            <img src={imageSrc} alt={nft?.name || 'NFT'} />
          ) : (
            <div className="detail-image-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        <div className="detail-body">
          <div className="detail-collection">{nft?.collection || ''}</div>
          <div className="detail-name">{nft?.name || ''}</div>

          <div className="detail-meta-row">
            {nft?.category && <span className="badge badge-accent">{nft.category}</span>}
            {nft?.tokenId && <span className="detail-token-id">Token #{nft.tokenId}</span>}
          </div>

          {nft?.description && <div className="detail-description">{nft.description}</div>}

          {traits.length > 0 && (
            <div className="detail-attrs">
              {traits.slice(0, 4).map((trait, idx) => (
                <div className="attr-card" key={`${trait.t}-${idx}`}>
                  <div className="attr-type">{trait.t}</div>
                  <div className="attr-val">{trait.v}</div>
                </div>
              ))}
            </div>
          )}

          <div className="detail-price-row">
            <div>
              <div className="detail-price-label">Current Price</div>
              <div className="detail-price-val">
                <EthIcon /> {nft?.price || '0.00'}
              </div>
              {usdPrice && <div className="detail-price-usd">≈ ${usdPrice}</div>}
            </div>
            {nft?.owner && (
              <div className="detail-seller-wrap">
                <div className="detail-price-label">Seller</div>
                <div className="detail-seller">{nft.owner.slice(0, 6)}…{nft.owner.slice(-4)}</div>
              </div>
            )}
          </div>

          {/* Transaction Status Display */}
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
                  <span>✓ Purchase successful!</span>
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

          <div className="detail-actions">
            <button
              className="btn btn-primary"
              onClick={handleBuyClick}
              disabled={!nft || txStatus === 'pending'}
              style={{ flex: 1 }}
            >
              {txStatus === 'pending' ? 'Processing...' : 'Buy Now'}
            </button>
            <button className="btn btn-secondary detail-watch-btn" disabled={!nft}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l2.4 5.1L16 6.8l-4 3.9 1 5.8L8 13.1l-5 2.4 1-5.8L0 6.8l5.6-.7L8 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panelUi, document.body);
};

const Explore = () => {
  const { account } = useWallet();
  const { buyNFT } = useNFTContract();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest first');
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [ethUsdRate, setEthUsdRate] = useState(3241); // Fallback rate

  // Fetch live ETH/USD rate
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const res = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        setEthUsdRate(res.data.ethereum.usd);
      } catch (err) {
        console.warn('Failed to fetch ETH rate, using fallback:', err);
        setEthUsdRate(3241); // Fallback
      }
    };
    
    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const useHtmlExamples = async () => {
      setLoading(true);
      try {
        // Keep the call for future backend integration, but always render the HTML example set.
        await axios.get('/api/nfts/listed');
      } catch {
        // Intentionally ignored: Explore page uses HTML examples as requested.
      } finally {
        setNfts(sampleNFTs);
        setLoading(false);
      }
    };

    useHtmlExamples();
  }, []);

  useEffect(() => {
    if (detailPanelOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [detailPanelOpen]);

  useEffect(() => {
    if (!detailPanelOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDetailPanelOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailPanelOpen]);

  useEffect(() => {
    if (detailPanelOpen) return undefined;
    if (!selectedNFT) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSelectedNFT(null);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [detailPanelOpen, selectedNFT]);

  const filtered = useMemo(() => {
    const nftArray = Array.isArray(nfts) ? nfts : [];
    let result = nftArray.filter((nft) => nft.listed === true);
    result = result.filter((nft) => category === 'All' || nft.category === category || !nft.category);

    if (sortBy === 'Price: Low → High') result = [...result].sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    if (sortBy === 'Price: High → Low') result = [...result].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    if (sortBy === 'Newest first') result = [...result].sort((a, b) => (b.tokenId ?? b.id ?? 0) - (a.tokenId ?? a.id ?? 0));
    if (sortBy === 'Most liked') result = [...result].sort((a, b) => ((b.likes ?? b.likeCount ?? 0) - (a.likes ?? a.likeCount ?? 0)));

    return result;
  }, [nfts, category, sortBy]);

  const floorPrice = filtered.length > 0
    ? Math.min(...filtered.map((n) => parseFloat(n.price) || 0)).toFixed(2)
    : '0.00';
  const listedCount = (Array.isArray(nfts) ? nfts : []).filter((nft) => nft.listed === true).length;

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setDetailPanelOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailPanelOpen(false);
  };

  // Integrated buy handler with backend sync
  const handleBuy = async (nft) => {
    if (!account || !nft) throw new Error('Wallet not connected or NFT not found');
    
    // Call marketplace contract
    const receipt = await buyNFT(nft.listingId, nft.price);
    
    // Sync with backend
    try {
      await axios.post('/api/nfts/buy', {
        tokenId: nft.tokenId,
        listingId: nft.listingId,
        newOwner: account,
        txHash: receipt.transactionHash,
      });
    } catch (err) {
      console.warn('Failed to sync purchase to backend:', err);
      // Don't throw — blockchain tx succeeded even if DB sync failed
    }
    
    return receipt;
  };

  const handleNFTBuy = (nft) => {
    if (!account) {
      alert('Please connect your wallet to purchase.');
      return;
    }
    // The DetailPanel will handle the actual buy call
  };

  return (
    <div className="explore">
      <div className="explore-hero">
        <div className="explore-hero-bg"></div>
        <div className="explore-hero-grid"></div>
        <div className="hero-content">
          <div className="hero-eyebrow">● {listedCount} items listed · floor {floorPrice} ETH</div>
          <div className="hero-title">DISCOVER<br />RARE DIGITAL<br />ASSETS</div>
          <div className="hero-sub">Explore the world's most exclusive NFTs from visionary creators on-chain.</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-pill${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              <span className="pill-dot"></span>
              {cat}
            </button>
          ))}
        </div>
        <div className="filter-sep"></div>
        <select className="input explore-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="nft-grid">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="nft-grid">
          {filtered.map((nft, i) => (
            <NFTCard
              key={nft.tokenId ?? nft.id ?? i}
              nft={{ ...nft, image: nft.ipfsUrl || nft.image || nft.imageUrl }}
              onBuy={handleBuy}
              onSelect={() => handleNFTClick(nft)}
              isSelected={selectedNFT?.id === nft.id || selectedNFT?.tokenId === nft.tokenId}
              likes={nft.likes ?? Math.floor(10 + (nft.id ?? i) * 7) % 99}
            />
          ))}
        </div>
      ) : (
        <div className="nft-grid">
          <div className="empty-state">
            <EmptyIcon />
            <h3>No NFTs Found</h3>
            <p>Try another category.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setCategory('All')}>
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {selectedNFT && (
        <DetailPanel
          nft={selectedNFT}
          isOpen={detailPanelOpen}
          onClose={handleCloseDetail}
          ethUsdRate={ethUsdRate}
          onBuy={handleBuy}
        />
      )}
    </div>
  );
};

export default Explore;
