// This module implements token revocation functionality
// We'll use a simple in-memory storage for revoked tokens
// In a production environment, you might want to use Redis or another persistence mechanism

// Store for revoked tokens with their expiry time
// Format: { [tokenId]: expiryTimestamp }
const revokedTokens = {};

// Clean up expired tokens periodically
const cleanupInterval = 1000 * 60 * 60; // 1 hour
setInterval(() => {
  const now = Date.now();
  Object.keys(revokedTokens).forEach((tokenId) => {
    if (revokedTokens[tokenId] < now) {
      delete revokedTokens[tokenId];
    }
  });
}, cleanupInterval);

/**
 * Add a token to the revoked list
 * @param {string} tokenId - Unique identifier for the token (usually jti claim)
 * @param {number} expiryTimestamp - Timestamp when the token expires
 */
const revokeToken = (tokenId, expiryTimestamp) => {
  revokedTokens[tokenId] = expiryTimestamp;
};

/**
 * Check if a token is revoked
 * @param {string} tokenId - Unique identifier for the token (usually jti claim)
 * @returns {boolean} - True if token is revoked
 */
const isTokenRevoked = (tokenId) => {
  return !!revokedTokens[tokenId];
};

/**
 * Get all revoked tokens (mainly for debugging)
 * @returns {Object} - Map of revoked tokens
 */
const getRevokedTokens = () => {
  return { ...revokedTokens };
};

module.exports = {
  revokeToken,
  isTokenRevoked,
  getRevokedTokens,
};
