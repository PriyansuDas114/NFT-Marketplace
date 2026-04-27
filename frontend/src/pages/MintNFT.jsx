import { useState } from 'react';
import { ethers } from 'ethers';
import { uploadToIPFS } from '../utils/ipfs';
import { mintNFTOnContract } from '../utils/mint';
import './MintNFT.css';

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const PlaceholderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);

const MintNFT = () => {
  const [nftData, setNftData] = useState({ name: '', description: '', price: '', image: null });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'info'|'success'|'error', msg }
  const [dragActive, setDragActive] = useState(false);

  const handleChange = (e) => {
    setNftData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImage = (file) => {
    if (!file) return;
    setNftData(prev => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description, price, image } = nftData;
    if (!name || !description || !price || !image) {
      setStatus({ type: 'error', msg: 'Please fill in all fields and upload an image.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', msg: 'Uploading metadata to IPFS…' });

    try {
      const metadataURL = await uploadToIPFS(image, { name, description });
      setStatus({ type: 'info', msg: 'Minting on blockchain — confirm in MetaMask…' });

      await mintNFTOnContract(metadataURL);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      await fetch('/api/nfts/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, price, ipfsUrl: metadataURL, owner: address, listed: false }),
      });

      setStatus({ type: 'success', msg: 'NFT minted successfully!' });
      setNftData({ name: '', description: '', price: '', image: null });
      setPreview(null);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Minting failed. Please try again.' });
    }

    setLoading(false);
  };

  return (
    <div className="mint-page">
      <div className="mint-header">
        <h1>Create New NFT</h1>
        <p>Upload your artwork and mint it as a unique digital asset on the blockchain</p>
      </div>

      <div className="mint-layout">
        {/* Form */}
        <div className="mint-form-card">
          {/* Upload */}
          <div
            className={`upload-zone${dragActive ? ' drag-active' : ''}${preview ? ' has-preview' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              accept="image/*"
              className="hidden-input"
              onChange={e => handleImage(e.target.files?.[0])}
            />
            {preview ? (
              <div className="preview-wrap">
                <img src={preview} alt="Upload preview" className="image-preview" />
                <label htmlFor="file-upload" className="change-image-btn">Change Image</label>
              </div>
            ) : (
              <label htmlFor="file-upload" className="upload-label">
                <div className="upload-icon"><UploadIcon /></div>
                <span className="upload-text">
                  Drag & drop or <span className="upload-highlight">browse</span>
                </span>
                <span className="upload-hint">JPG, PNG, GIF, SVG — up to 10 MB</span>
              </label>
            )}
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="label" htmlFor="nft-name">NFT Name</label>
            <input
              id="nft-name"
              name="name"
              type="text"
              className="input"
              placeholder="e.g. Cosmic Dreams #42"
              value={nftData.name}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label" htmlFor="nft-desc">Description</label>
            <textarea
              id="nft-desc"
              name="description"
              className="input"
              placeholder="Describe your NFT — its story, inspiration, or what makes it unique…"
              value={nftData.description}
              onChange={handleChange}
              disabled={loading}
              rows={4}
            />
          </div>

          {/* Price */}
          <div className="form-group">
            <label className="label" htmlFor="nft-price">Price (ETH)</label>
            <div className="input-with-prefix">
              <span className="input-prefix">Ξ</span>
              <input
                id="nft-price"
                name="price"
                type="number"
                className="input input-prefix-pad"
                placeholder="0.05"
                step="0.001"
                min="0"
                value={nftData.price}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" /> Minting…</>
            ) : (
              'Mint NFT'
            )}
          </button>

          {/* Status */}
          {status && (
            <div className={`mint-status ${status.type}`}>
              {status.type === 'success' && '✓ '}
              {status.type === 'error' && '✕ '}
              {status.msg}
            </div>
          )}
        </div>

        {/* Live preview card */}
        <div className="preview-card">
          <div className="preview-card__label">Live Preview</div>
          <div className="preview-card__img-wrap">
            {preview ? (
              <img src={preview} alt="NFT Preview" className="preview-card__img" />
            ) : (
              <div className="preview-card__placeholder">
                <PlaceholderIcon />
                <span>Image preview</span>
              </div>
            )}
          </div>
          <div className="preview-card__body">
            <div className="preview-card__name">{nftData.name || 'Untitled NFT'}</div>
            <div className="preview-card__desc">
              {nftData.description
                ? nftData.description.slice(0, 72) + (nftData.description.length > 72 ? '…' : '')
                : 'No description provided.'}
            </div>
            <div className="preview-card__footer">
              <span className="preview-card__price-label">Price</span>
              <span className="preview-card__price-val">
                {nftData.price ? `Ξ ${nftData.price}` : '— ETH'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintNFT;
