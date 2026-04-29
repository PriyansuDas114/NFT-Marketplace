import { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import marketplaceAbi from '../abis/Marketplace.json';
import { createAuthHeaders } from '../utils/auth';
import './ListNFT.css';

const CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const CATEGORIES = ['Art', 'Gaming', 'Music', 'Domains', 'Sports'];

const PickerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);

const Step = ({ num, label, state }) => (
  <div className={`step ${state}`}>
    <div className="step-num">
      {state === 'done' ? '✓' : num}
    </div>
    {label}
  </div>
);

const ListNFT = () => {
  const [nfts, setNfts] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [listing, setListing] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/nfts')
      .then(res => setNfts(res.data.filter(n => !n.listed)))
      .catch(() => setNfts([]));
  }, []);

  const handleSelect = (nft) => {
    setSelectedNFT(nft);
    setPrice(nft.price || '');
    setCategory(nft.category || '');
    setStatus(null);
  };

  const handleList = async () => {
    if (!price || isNaN(price) || Number(price) <= 0) {
      setStatus({ type: 'error', msg: 'Enter a valid price greater than 0.' });
      return;
    }
    if (!category) {
      setStatus({ type: 'error', msg: 'Please select a category.' });
      return;
    }

    setListing(true);
    setStatus({ type: 'info', msg: 'Connecting wallet…' });

    try {
      if (!window.ethereum) throw new Error('Wallet not found. Install MetaMask.');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, marketplaceAbi, signer);

      setStatus({ type: 'info', msg: 'Listing on blockchain — confirm in MetaMask…' });
      const tx = await contract.listNFT(selectedNFT.tokenId, ethers.parseEther(price));
      await tx.wait();

      setStatus({ type: 'info', msg: 'Updating database…' });
      const headers = await createAuthHeaders(signer);
      await axios.post('http://localhost:5000/api/nfts/list', {
        tokenId: selectedNFT.tokenId, price, category,
      }, { headers });

      setStatus({ type: 'success', msg: 'NFT listed successfully!' });
      setNfts(prev => prev.filter(n => n.tokenId !== selectedNFT.tokenId));
      setSelectedNFT(null);
      setPrice('');
      setCategory('');
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Listing failed. Please try again.' });
    }

    setListing(false);
  };

  const stepStates = {
    1: selectedNFT ? 'done' : 'active',
    2: selectedNFT ? (listing || status?.type === 'success' ? 'done' : 'active') : '',
    3: status?.type === 'success' ? 'active' : '',
  };

  return (
    <div className="list-page">
      <div className="list-header">
        <h1>List NFT for Sale</h1>
        <p>Select one of your NFTs, set a price, and publish it to the marketplace</p>
      </div>

      {/* Steps */}
      <div className="list-steps">
        <Step num={1} label="Select NFT"    state={stepStates[1]} />
        <div className="step-divider" />
        <Step num={2} label="Set Price"     state={selectedNFT ? 'active' : ''} />
        <div className="step-divider" />
        <Step num={3} label="Confirm"       state={stepStates[3]} />
      </div>

      <div className="list-layout">
        {/* NFT Picker */}
        <div className="nft-picker-card">
          <h2>Your Unlisted NFTs</h2>
          <div className="nft-picker-grid">
            {nfts.length === 0 ? (
              <div className="picker-empty">No unlisted NFTs found in your wallet.</div>
            ) : nfts.map(nft => (
              <div
                key={nft.tokenId}
                className={`picker-nft${selectedNFT?.tokenId === nft.tokenId ? ' selected' : ''}`}
                onClick={() => handleSelect(nft)}
              >
                <img
                  src={nft.ipfsUrl || nft.image || nft.imageUrl || '/placeholder.png'}
                  alt={nft.name}
                  onError={e => { e.target.src = '/placeholder.png'; }}
                />
                <div className="picker-nft__label">{nft.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Listing panel */}
        <div className="listing-panel">
          {!selectedNFT ? (
            <div className="listing-panel__placeholder">
              <PickerIcon />
              <p>Select an NFT from the left to configure your listing</p>
            </div>
          ) : (
            <div className="listing-detail">
              <img
                src={selectedNFT.ipfsUrl || selectedNFT.image || selectedNFT.imageUrl}
                alt={selectedNFT.name}
                className="listing-detail__img"
              />
              <div className="listing-detail__body">
                <div className="listing-detail__name">{selectedNFT.name}</div>

                <div className="listing-form">
                  {/* Price */}
                  <div>
                    <label className="label">Price (ETH)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: 14, fontFamily: 'var(--font-mono)', color: 'var(--c-accent)', fontWeight: 500, fontSize: 14, pointerEvents: 'none' }}>Ξ</span>
                      <input
                        type="number"
                        className="input"
                        style={{ paddingLeft: 36 }}
                        placeholder="0.05"
                        step="0.001"
                        min="0"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        disabled={listing}
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="label">Category</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        className="input"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        disabled={listing}
                      >
                        <option value="">Select a category…</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Status */}
                  {status && (
                    <div className={`listing-status ${status.type}`}>{status.msg}</div>
                  )}

                  {/* CTA */}
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleList}
                    disabled={listing}
                  >
                    {listing ? (
                      <><span className="btn-spinner" /> Listing…</>
                    ) : (
                      'List for Sale'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListNFT;
