import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { sampleNFTs } from '../data/sampleNFTs';

// ─────────────────────────────────────────────────────────────
//  useNFTs — fetch and cache NFT lists from the backend
//
//  Returns:
//    nfts       — full list
//    listed     — listed-only subset
//    loading    — boolean
//    error      — error string or null
//    refetch()  — manually re-trigger fetch
// ─────────────────────────────────────────────────────────────

export const useNFTs = ({ listedOnly = false } = {}) => {
  const [nfts,    setNfts]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = listedOnly ? '/api/nfts/listed' : '/api/nfts';
      const res = await axios.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : (res.data?.nfts || []);
      setNfts(data.length > 0 ? data : sampleNFTs);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err.message);
      setNfts(sampleNFTs); // fallback to sample data
    } finally {
      setLoading(false);
    }
  }, [listedOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  return { nfts, loading, error, refetch: fetch };
};

export default useNFTs;
