import { ethers } from 'ethers';

/**
 * Shorten an Ethereum address for display.
 * e.g. 0x1234...5678
 */
export const shortAddress = (address, chars = 4) => {
  if (!address || address.length < 10) return address ?? '';
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
};

/**
 * Format a wei value as a human-readable ETH string.
 * e.g. "Ξ 1.2500"
 */
export const formatETH = (wei, decimals = 4) => {
  try {
    const val = parseFloat(ethers.formatEther(wei.toString()));
    return `Ξ ${val.toFixed(decimals)}`;
  } catch {
    return '—';
  }
};

/**
 * Format a plain ETH number string with symbol.
 * e.g. formatEthAmount("1.25") → "Ξ 1.2500"
 */
export const formatEthAmount = (amount, decimals = 4) => {
  const val = parseFloat(amount);
  if (isNaN(val)) return '—';
  return `Ξ ${val.toFixed(decimals)}`;
};

/**
 * Format a Unix timestamp as a relative time string.
 * e.g. "2 hours ago"
 */
export const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - Number(timestamp) * 1000) / 1000);
  const intervals = [
    { label: 'year',   secs: 31_536_000 },
    { label: 'month',  secs: 2_592_000  },
    { label: 'week',   secs: 604_800    },
    { label: 'day',    secs: 86_400     },
    { label: 'hour',   secs: 3_600      },
    { label: 'minute', secs: 60         },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
};

/**
 * Clamp a string to maxLength, adding ellipsis if truncated.
 */
export const truncate = (str, maxLength = 60) => {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
};
