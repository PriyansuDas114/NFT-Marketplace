import './NFTCard.css';

const EthIcon = () => (
  <svg className="eth-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);

const NFTCard = ({ nft, isSelected, onSelect, onBuy, likes = 0 }) => {
  const imgSrc = nft?.ipfsUrl || nft?.image || nft?.imageUrl;
  const name = nft?.name || 'Unnamed NFT';
  const price = nft?.price || '0.00';
  const owner = nft?.owner;
  const category = nft?.category || 'Art';
  const tokenLabel = nft?.tokenId ?? nft?.id ?? 0;
  const collectionName = nft?.collection || 'Collection';

  return (
    <div
      className={`nft-card${isSelected ? ' nft-card--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
    >
      <div className="nft-image-wrap">
        {imgSrc ? (
          <img src={imgSrc} alt={name} className="nft-image" loading="lazy" />
        ) : (
          <div className="nft-image-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        <div className="nft-overlay">
          <button
            className="btn btn-primary btn-sm btn-mono"
            onClick={(e) => { e.stopPropagation(); onBuy?.(nft); }}
          >
            Buy Now
          </button>
        </div>

        <div className="nft-rank">#{tokenLabel}</div>

        <button className="nft-like" onClick={(e) => e.stopPropagation()}>
          <HeartIcon />
          <span>{likes}</span>
        </button>

        {category && (
          <span className="nft-category-chip">{category}</span>
        )}
      </div>

      <div className="nft-body">
        <div className="nft-collection">{collectionName} {category ? `· ${category}` : ''}</div>
        <h3 className="nft-name">{name}</h3>

        {owner && (
          <p className="nft-owner-row">
            <span>by</span>
            <span className="nft-owner-address">{owner.slice(0, 6)}…{owner.slice(-4)}</span>
          </p>
        )}

        <div className="nft-footer">
          <div className="nft-price-group">
            <div className="nft-price-label">Price</div>
            <div className="nft-price-val">
              <EthIcon />
              <span>{price}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm btn-mono" onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
            View →
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFTCard;
