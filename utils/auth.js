const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Generate a JWT token for user authentication
 *
 * @param {Object} user - User object containing id, email, username, role
 * @param {string} expiresIn - Token expiration time (e.g., '24h', '7d')
 * @returns {Object} - Object containing the JWT token and its expiration timestamp
 */
const generateToken = (user, expiresIn = "24h") => {
  // Generate a unique token ID (jti) for possible revocation
  const tokenId = require("crypto").randomBytes(16).toString("hex");

  // Calculate expiration time
  const expirationMs = expiresIn.includes("h")
    ? parseInt(expiresIn) * 60 * 60 * 1000
    : expiresIn.includes("d")
    ? parseInt(expiresIn) * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000; // Default 24h

  const expiresAt = Date.now() + expirationMs;

  // Sign the token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || "user",
      jti: tokenId,
    },
    process.env.TOKEN_SECRET,
    { expiresIn }
  );

  return { token, tokenId, expiresAt };
};

/**
 * Hash a password using bcrypt
 *
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Verify if provided password matches stored password hash
 *
 * @param {string} password - Plain text password to check
 * @param {string} hashedPassword - Stored hashed password to compare against
 * @returns {boolean} - True if password matches, false otherwise
 */
const verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Find a user by their ID
 *
 * @param {string} userId - User ID to search for
 * @param {boolean} includePassword - Whether to include password in the result
 * @returns {Object|null} - User object if found, null otherwise
 */
const findUserById = async (userId, includePassword = false) => {
  const select = {
    id: true,
    username: true,
    email: true,
    avatar: true,
    role: true,
    created_at: true,
    updated_at: true,
  };

  if (includePassword) {
    select.password = true;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select,
  });
};

/**
 * Find a user by their email
 *
 * @param {string} email - Email to search for
 * @param {boolean} includePassword - Whether to include password in the result
 * @returns {Object|null} - User object if found, null otherwise
 */
const findUserByEmail = async (email, includePassword = false) => {
  const select = {
    id: true,
    username: true,
    email: true,
    avatar: true,
    role: true,
    created_at: true,
    updated_at: true,
  };

  if (includePassword) {
    select.password = true;
  }

  return prisma.user.findUnique({
    where: { email },
    select,
  });
};

module.exports = {
  generateToken,
  hashPassword,
  verifyPassword,
  findUserById,
  findUserByEmail,
};
