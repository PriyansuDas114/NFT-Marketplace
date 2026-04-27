import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/**
 * WalletConnector — standalone embeddable widget.
 * For global wallet state, use the Header's built-in connector.
 */
const WalletConnector = () => {
  const [address, setAddress]   = useState('');
  const [balance, setBalance]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer  = await provider.getSigner();
      const addr    = await signer.getAddress();
      const bal     = await provider.getBalance(addr);
      setAddress(addr);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (err) {
      setError(err.message || 'Connection failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (window.ethereum?.selectedAddress) {
      setAddress(window.ethereum.selectedAddress);
    }
    const onChange = (accounts) => {
      setAddress(accounts[0] || '');
      setBalance('');
    };
    window.ethereum?.on('accountsChanged', onChange);
    return () => window.ethereum?.removeListener('accountsChanged', onChange);
  }, []);

  const shortAddr = address
    ? `${address.slice(0,6)}…${address.slice(-4)}`
    : null;

  return (
    <div style={{
      background: 'var(--c-surface-2)',
      border: '1px solid var(--c-border)',
      borderRadius: 'var(--r-lg)',
      padding: '20px',
      maxWidth: 320,
      fontFamily: 'var(--font-display)',
    }}>
      {address ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--c-accent),var(--c-violet))',
              flexShrink: 0
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-1)' }}>{shortAddr}</div>
              {balance && <div style={{ fontSize: 11, color: 'var(--c-accent)', fontFamily: 'var(--font-mono)' }}>Ξ {balance}</div>}
            </div>
          </div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--c-text-3)', wordBreak: 'break-all' }}>{address}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--c-text-2)', margin: 0 }}>Connect your wallet to get started</p>
          <button className="btn btn-primary btn-full" onClick={connectWallet} disabled={loading}>
            {loading ? 'Connecting…' : 'Connect Wallet'}
          </button>
          {error && (
            <p style={{ fontSize: 12, color: 'var(--c-red)', margin: 0 }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletConnector;
