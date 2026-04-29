import { useState } from 'react';
import { ethers } from 'ethers';
import { uploadToIPFS } from '../utils/ipfs';
import { mintNFTOnContract } from '../utils/mint';
import { createAuthHeaders } from '../utils/auth';
import './MintNFT.css';

const UploadIcon = () => (
  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 14V3M7 7l4-4 4 4"/><path d="M2 16v2a2 2 0 002 2h14a2 2 0 002-2v-2"/>
  </svg>
);

const MintNFT = () => {
  const [step, setStep] = useState(1);
  const [nftData, setNftData] = useState({ name: '', description: '', category: '', royalty: '5', price: '', image: null });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
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
    if (step === 1) setStep(2);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

    setStep(3);
    setLoading(true);
    setStatus({ type: 'info', msg: 'Uploading to IPFS…' });

    try {
      const metadataURL = await uploadToIPFS(image, { name, description });
      setStep(4);
      setStatus({ type: 'info', msg: 'Minting on blockchain — confirm in wallet…' });

      await mintNFTOnContract(metadataURL);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const headers = await createAuthHeaders(signer);
      await fetch('/api/nfts/mint', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, description, price, ipfsUrl: metadataURL, owner: address, listed: false }),
      });

      setStatus({ type: 'success', msg: 'NFT minted successfully!' });
      setNftData({ name: '', description: '', category: '', royalty: '5', price: '', image: null });
      setPreview(null);
      setStep(1);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Minting failed. Please try again.' });
      setStep(2);
    }

    setLoading(false);
  };

  return (
    <div className="mint-page">
      {/* Header */}
      <div className="mint-header">
        <h1>CREATE NEW NFT</h1>
        <p>Mint your digital asset directly on-chain via IPFS metadata</p>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {[1, 2, 3, 4].map((s, idx) => (
          <div key={s}>
            <div className={`progress-step ${step >= s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
              <div className="step-circle">{s}</div>
              <div className="step-label">
                {['Upload', 'Metadata', 'IPFS', 'Mint'][idx]}
              </div>
            </div>
            {idx < 3 && <div className="step-line" />}
          </div>
        ))}
      </div>

      {/* Main Layout */}
      <div className="mint-layout">
        {/* Form */}
        <div>
          {/* Upload Card */}
          <div className="mint-card">
            <div className="card-label">Artwork File</div>
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
                  <label htmlFor="file-upload" className="change-image-btn">Change</label>
                </div>
              ) : (
                <label htmlFor="file-upload" className="upload-label">
                  <div className="upload-icon-wrap"><UploadIcon /></div>
                  <span className="upload-text">
                    Drag & drop or <span className="upload-highlight">browse</span>
                  </span>
                  <span className="upload-hint">JPG · PNG · GIF · MP4 · SVG · max 50MB</span>
                </label>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          <div className="mint-card">
            <div className="card-label">Metadata</div>
            
            <div className="form-group">
              <label className="form-label">NFT Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder='e.g. "Nebula Protocol #42"'
                value={nftData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                placeholder="Describe your NFT — its story, inspiration, rarity…"
                value={nftData.description}
                onChange={handleChange}
                disabled={loading}
                rows={4}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-input"
                  value={nftData.category}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select category</option>
                  <option value="Art">Art</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Music">Music</option>
                  <option value="Domains">Domains</option>
                  <option value="Sports">Sports</option>
                  <option value="Photography">Photography</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Royalty %</label>
                <input
                  type="number"
                  name="royalty"
                  className="form-input"
                  placeholder="e.g. 5"
                  min="0"
                  max="25"
                  step="0.5"
                  value={nftData.royalty}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="mint-card">
            <div className="card-label">Pricing</div>
            
            <div className="form-group">
              <label className="form-label">List Price (ETH)</label>
              <div className="input-adornment">
                <span className="adornment">Ξ</span>
                <input
                  type="number"
                  name="price"
                  className="form-input"
                  placeholder="0.08"
                  step="0.001"
                  min="0"
                  value={nftData.price}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Mint Button */}
          <button
            className="btn btn-primary btn-full btn-lg btn-mono"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" /> Minting…</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2" strokeLinecap="round"/>
                </svg>
                MINT NFT
              </>
            )}
          </button>

          {/* Status */}
          {status && (
            <div className={`mint-status ${status.type}`}>
              {status.msg}
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="preview-card">
          <div className="preview-top">
            <div className="preview-label">LIVE PREVIEW</div>
            <div className="preview-img-wrap">
              {preview ? (
                <img src={preview} alt="NFT Preview" className="preview-img" />
              ) : (
                <span className="preview-emoji">🎨</span>
              )}
            </div>
          </div>
          <div className="preview-body">
            <div className="preview-name">{nftData.name || 'Untitled NFT'}</div>
            <div className="preview-desc">
              {nftData.description || 'Your NFT description will appear here as you type...'}
            </div>
            <div className="preview-price-row">
              <span className="preview-price-label">List Price</span>
              <span className="preview-price-val">
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
