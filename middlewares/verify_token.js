const jwt = require("jsonwebtoken");
const { findUserById } = require("../utils/auth");
const { isTokenRevoked } = require("../utils/token_revocation");

/**
 * Middleware to verify user authentication based on JWT token
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const bearerHeader = req.headers["authorization"];

    // Check if bearer is undefined
    if (!bearerHeader) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    // Split at the space
    const bearer = bearerHeader.split(" ");

    // Get token from array
    const token = bearer[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. Invalid token format." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Check if token has been revoked (if it has a jti claim)
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res
        .status(401)
        .json({ error: "Token has been revoked. Please login again." });
    }

    // Get user from database to verify they still exist
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    // Add user info to request object
    req.user = user;

    // Continue
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired." });
    } else {
      console.error("Auth error:", error);
      return res
        .status(500)
        .json({ error: "Internal server error during authentication." });
    }
  }
};

/**
 * Function to verify user token without using middleware
 * Can be used in specific routes or functions that need to validate a token
 *
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - User object if valid, null if invalid
 */
const verifyUserToken = async (token) => {
  try {
    if (!token) {
      return null;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Get user from database using utility function
    const user = await findUserById(decoded.id);

    return user || null;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};

module.exports = {
  verifyToken,
  verifyUserToken,
};
