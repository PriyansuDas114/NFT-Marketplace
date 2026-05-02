import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import './Header.css';

const pageTitles = {
  '/':        'Dashboard',
  '/mint':    'Mint NFT',
  '/list':    'List NFT',
  '/explore': 'Explore',
  '/gallery': 'Gallery',
  '/profile': 'Profile',
};

const WalletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 010-4h14v4"/>
    <path d="M3 5v14a2 2 0 002 2h16v-5"/>
    <path d="M18 12a2 2 0 000 4h4v-4z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const DisconnectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 8 20 12 16 16"/>
    <line x1="9" y1="12" x2="20" y2="12"/>
  </svg>
);

const Header = () => {
  const { account, isConnecting, error, connect, disconnect } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  
  // Get page title with support for dynamic routes
  let title = 'NexMint';
  if (location.pathname.startsWith('/nft/')) {
    title = 'NFT Details';
  } else if (location.pathname.startsWith('/profile/')) {
    title = 'Profile';
  } else {
    title = pageTitles[location.pathname] || 'NexMint';
  }

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-page-title">{title}</span>
        <div className="search-bar">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search NFTs, collections, wallets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="header-right">
        {account ? (
          <div className="wallet-menu">
            <div className="wallet-chip" title={account}>
              <div className="wallet-avatar" />
              <span className="wallet-address">{shortAddress}</span>
            </div>
            <button 
              className="wallet-disconnect-btn" 
              onClick={disconnect}
              title="Disconnect wallet"
              aria-label="Disconnect"
            >
              <DisconnectIcon />
            </button>
          </div>
        ) : (
          <button 
            className="wallet-btn" 
            onClick={connect}
            disabled={isConnecting}
          >
            <WalletIcon />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
        {error && <div className="wallet-error-tooltip" title={error}>⚠</div>}
      </div>
    </header>
  );
};

export default Header;
