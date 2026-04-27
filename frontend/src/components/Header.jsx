import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
import './Header.css';

const pageTitles = {
  '/':        'Dashboard',
  '/mint':    'Mint NFT',
  '/list':    'List NFT',
  '/explore': 'Explore',
  '/gallery': 'Gallery',
};

const WalletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 010-4h14v4"/>
    <path d="M3 5v14a2 2 0 002 2h16v-5"/>
    <path d="M18 12a2 2 0 000 4h4v-4z"/>
  </svg>
);

const Header = () => {
  const [account, setAccount] = useState(null);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'NexMint';

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to connect your wallet.');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  useEffect(() => {
    // Auto-detect already-connected wallet
    if (window.ethereum?.selectedAddress) {
      setAccount(window.ethereum.selectedAddress);
    }
    // Listen for account changes
    const handleAccountsChanged = (accounts) => {
      setAccount(accounts.length > 0 ? accounts[0] : null);
    };
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="header-page-title">{title}</span>
      </div>
      <div className="header-right">
        <div className="network-pill">
          <span className="network-dot" />
          Hardhat
        </div>
        {account ? (
          <div className="wallet-chip" title={account}>
            <div className="wallet-avatar" />
            <span className="wallet-address">{shortAddress}</span>
          </div>
        ) : (
          <button className="wallet-btn" onClick={connectWallet}>
            <WalletIcon />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
