const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../middlewares/verify_token");
const { generateToken, findUserById } = require("../utils/auth");

/**
 * Refresh token route
 * This route allows users to get a new token before their old one expires
 * The user must send their current valid token to get a new one
 */
router.post("/refresh", verifyToken, async (req, res) => {
  try {
    // verifyToken middleware already validated the token and added user to request
    const userId = req.user.id;

    // Get fresh user data
    const user = await findUserById(userId);

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    } // Generate new token with a fresh expiration time
    const { token, expiresAt } = generateToken(user);

    // Return the new token with user data including role
    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role || "user",
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

/**
 * Validate token route
 * This simply checks if the token is valid without refreshing it
 */
router.get("/validate", verifyToken, (req, res) => {
  // If we got here, the token is valid (verifyToken middleware would have rejected invalid tokens)
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role || "user",
    },
  });
});

module.exports = router;
