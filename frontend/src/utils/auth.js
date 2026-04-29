/**
 * auth.js — Wallet-based authentication for API requests
 *
 * Signs messages with the user's wallet to prove ownership
 * and includes signature in request headers for backend verification.
 */

/**
 * signAuthMessage — Creates signed message + wallet headers
 * 
 * @param {ethers.Signer} signer — ethers.js signer instance
 * @returns {Object} Headers with wallet address, signature, and message
 */
export const signAuthMessage = async (signer) => {
  if (!signer) {
    throw new Error('Signer is required for authentication');
  }

  try {
    const message = `NexMint auth: ${Date.now()}`;
    const signature = await signer.signMessage(message);
    const address = await signer.getAddress();

    return {
      'x-wallet-address': address,
      'x-wallet-signature': signature,
      'x-wallet-message': message,
    };
  } catch (err) {
    console.error('[Auth] Failed to sign message:', err);
    throw new Error(`Authentication failed: ${err.message}`);
  }
};

/**
 * createAuthHeaders — Convenience function for API calls
 * 
 * @param {ethers.Signer} signer — ethers.js signer
 * @returns {Object} Complete headers object ready for fetch/axios
 */
export const createAuthHeaders = async (signer) => {
  const walletHeaders = await signAuthMessage(signer);
  return {
    'Content-Type': 'application/json',
    ...walletHeaders,
  };
};
