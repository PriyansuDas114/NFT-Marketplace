import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────
//  WalletContext
//
//  Single source of truth for:
//    • account      — connected address (null if disconnected)
//    • signer       — ethers Signer (null if disconnected)
//    • provider     — ethers BrowserProvider (null if disconnected)
//    • chainId      — bigint chain ID (null if disconnected)
//    • balance      — formatted ETH string (null if disconnected)
//    • isConnecting — loading state during connect()
//    • error        — last connection error message
//
//  All pages and components import useWallet() — never call
//  window.ethereum directly in components again.
// ─────────────────────────────────────────────────────────────

const WalletContext = createContext(null);

const SUPPORTED_CHAIN_IDS = [
  1n,      // Mainnet
  11155111n, // Sepolia
  31337n,  // Hardhat local
];

const CHAIN_NAMES = {
  1n:       'Ethereum',
  11155111n: 'Sepolia',
  31337n:   'Hardhat',
};

export const WalletProvider = ({ children }) => {
  const [account,      setAccount]      = useState(null);
  const [signer,       setSigner]       = useState(null);
  const [provider,     setProvider]     = useState(null);
  const [chainId,      setChainId]      = useState(null);
  const [balance,      setBalance]      = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState(null);

  // ── Internal helpers ──────────────────────────────────────

  const _hydrateFromProvider = useCallback(async (ethProvider) => {
    const s       = await ethProvider.getSigner();
    const addr    = await s.getAddress();
    const network = await ethProvider.getNetwork();
    const bal     = await ethProvider.getBalance(addr);

    setSigner(s);
    setProvider(ethProvider);
    setAccount(addr);
    setChainId(network.chainId);
    setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
  }, []);

  const _reset = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
    setBalance(null);
    setError(null);
  }, []);

  // ── Public API ────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('No Ethereum wallet found. Please install MetaMask.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      await ethProvider.send('eth_requestAccounts', []);
      await _hydrateFromProvider(ethProvider);
    } catch (err) {
      setError(err.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [_hydrateFromProvider]);

  const disconnect = useCallback(() => {
    _reset();
  }, [_reset]);

  const switchChain = useCallback(async (targetChainId) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (err) {
      setError(`Could not switch network: ${err.message}`);
    }
  }, []);

  // ── Auto-connect on mount (if already approved) ───────────

  useEffect(() => {
    if (!window.ethereum) return;

    const tryAutoConnect = async () => {
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await ethProvider.send('eth_accounts', []);
        if (accounts.length > 0) {
          await _hydrateFromProvider(ethProvider);
        }
      } catch {
        // Silent — user hasn't approved yet
      }
    };

    tryAutoConnect();
  }, [_hydrateFromProvider]);

  // ── Wallet event listeners ────────────────────────────────

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        _reset();
      } else {
        try {
          const ethProvider = new ethers.BrowserProvider(window.ethereum);
          await _hydrateFromProvider(ethProvider);
        } catch (err) {
          setError(err.message);
        }
      }
    };

    const handleChainChanged = () => {
      // Full page reload is the safest approach after a chain switch
      // because contract instances, provider objects, and cached state
      // are all chain-specific.
      window.location.reload();
    };

    const handleDisconnect = () => {
      _reset();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged',    handleChainChanged);
    window.ethereum.on('disconnect',      handleDisconnect);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged',    handleChainChanged);
      window.ethereum.removeListener('disconnect',      handleDisconnect);
    };
  }, [_hydrateFromProvider, _reset]);

  // ── Derived values ────────────────────────────────────────

  const isConnected     = Boolean(account);
  const chainName       = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : null;
  const isWrongNetwork  = chainId !== null && !SUPPORTED_CHAIN_IDS.includes(chainId);
  const shortAddress    = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : null;

  const value = useMemo(() => ({
    // State
    account,
    signer,
    provider,
    chainId,
    balance,
    isConnecting,
    error,
    // Derived
    isConnected,
    chainName,
    isWrongNetwork,
    shortAddress,
    // Actions
    connect,
    disconnect,
    switchChain,
  }), [
    account, signer, provider, chainId, balance,
    isConnecting, error, isConnected, chainName,
    isWrongNetwork, shortAddress,
    connect, disconnect, switchChain,
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used inside <WalletProvider>');
  }
  return ctx;
};

export default WalletContext;
