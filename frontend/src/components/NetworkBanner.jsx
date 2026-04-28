import { useWallet } from '../context/WalletContext';
import './NetworkBanner.css';

const HARDHAT_CHAIN_ID = 31337;

const NetworkBanner = () => {
  const { isConnected, isWrongNetwork, switchChain } = useWallet();

  if (!isConnected || !isWrongNetwork) return null;

  return (
    <div className="network-banner" role="alert">
      <span className="network-banner__icon" aria-hidden="true">⚠</span>
      <span className="network-banner__text">
        Wrong network detected. Please switch to Hardhat, Sepolia, or Ethereum Mainnet.
      </span>
      <button
        className="network-banner__btn"
        onClick={() => switchChain(HARDHAT_CHAIN_ID)}
      >
        Switch to Hardhat
      </button>
    </div>
  );
};

export default NetworkBanner;
