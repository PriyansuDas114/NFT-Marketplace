import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import NFTCard from '../components/NFTCard';
import { SkeletonCard } from '../components/Spinner';
import './UserProfile.css';

const UserProfile = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const { account } = useWallet();

  const [user, setUser] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('owned');

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/users/${address}`);
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError(err.response?.data?.message || 'User not found');
      }
    };

    if (address) fetchUser();
  }, [address]);

  // Fetch user's NFTs
  useEffect(() => {
    const fetchUserNFTs = async () => {
      try {
        const res = await axios.get(`/api/nfts/owner/${address}`);
        setNfts(res.data);
      } catch (err) {
        console.warn('Failed to fetch user NFTs:', err);
        setNfts([]);
      } finally {
        setLoading(false);
      }
    };

    if (address) fetchUserNFTs();
  }, [address]);

  if (loading) return (
    <div className="user-profile">
      <div className="nft-grid">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="user-profile">
      <div className="error-message">{error}</div>
    </div>
  );

  const isOwnProfile = account?.toLowerCase() === address?.toLowerCase();
  const ownedNFTs = nfts.filter(nft => !nft.listed);
  const listedNFTs = nfts.filter(nft => nft.listed);

  const socialLinks = user?.social ? JSON.parse(user.social) : {};

  const displayedNFTs = activeTab === 'owned' ? ownedNFTs : listedNFTs;

  return (
    <div className="user-profile">
      {/* Profile Header */}
      <div className="profile-header">
        <button className="profile-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="profile-card">
          <div className="profile-avatar-wrap">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username || 'User'} className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <div>
                <h1 className="profile-username">{user?.username || 'Unnamed User'}</h1>
                <p className="profile-address">{address}</p>
              </div>
              {isOwnProfile && (
                <button className="btn btn-secondary btn-sm">Edit Profile</button>
              )}
            </div>

            {user?.bio && <p className="profile-bio">{user.bio}</p>}

            <div className="profile-links">
              {user?.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="profile-link">
                  🔗 {new URL(user.website).hostname}
                </a>
              )}
              {Object.entries(socialLinks).map(([key, val]) => (
                <a key={key} href={val} target="_blank" rel="noopener noreferrer" className="profile-link">
                  {key === 'twitter' && '𝕏'} {key.charAt(0).toUpperCase() + key.slice(1)}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-label">Total NFTs</div>
            <div className="stat-value">{nfts.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Owned</div>
            <div className="stat-value">{ownedNFTs.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Listed</div>
            <div className="stat-value">{listedNFTs.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Member Since</div>
            <div className="stat-value">{new Date(user?.createdAt).getFullYear()}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'owned' ? 'active' : ''}`}
          onClick={() => setActiveTab('owned')}
        >
          Owned ({ownedNFTs.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'listed' ? 'active' : ''}`}
          onClick={() => setActiveTab('listed')}
        >
          For Sale ({listedNFTs.length})
        </button>
      </div>

      {/* NFT Grid */}
      {displayedNFTs.length > 0 ? (
        <div className="nft-grid">
          {displayedNFTs.map((nft, i) => (
            <NFTCard
              key={nft.tokenId ?? nft.id ?? i}
              nft={{ ...nft, image: nft.ipfsUrl || nft.image || nft.imageUrl }}
              onSelect={() => navigate(`/nft/${nft.id}`)}
              likes={nft.likes ?? Math.floor(10 + (nft.id ?? i) * 7) % 99}
            />
          ))}
        </div>
      ) : (
        <div className="nft-grid">
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <h3>No NFTs {activeTab === 'listed' ? 'for sale' : 'owned'}</h3>
            <p>
              {activeTab === 'listed'
                ? 'Check back soon for new listings'
                : `${isOwnProfile ? 'Mint your first NFT' : 'This user has no NFTs yet'}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
