const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const {
  generateToken,
  verifyPassword,
  hashPassword,
  findUserByEmail,
} = require("../utils/auth");

// Login route - generates authentication token
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`Login attempt for ${email}`);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email with password included for verification
    const user = await findUserByEmail(email, true);

    // Check if user exists
    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Validate password
    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      console.log(`Login failed: Invalid password for ${email}`);
      return res.status(401).json({ error: "Invalid email or password" });
    } // Create and sign token
    console.log(`Login successful for ${email}, generating token`);
    const { token, expiresAt } = generateToken(user);

    // Send response with token
    res.status(200).json({
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
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
});

// Register route - creates new user
router.post("/register", async (req, res) => {
  console.log("Registering user:", req.body);
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email and password are required" });
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    }); // Create and sign token
    const { token, expiresAt } = generateToken(newUser);

    // Send response with token and token info
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      expiresAt,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role || "user",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration",
    });
  }
});

// Logout route - invalidates the current token
router.post("/logout", async (req, res) => {
  try {
    // Get authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
      // Decode the token to get its jti claim
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

      // If token has a jti claim, revoke it
      if (decoded.jti) {
        const { revokeToken } = require("../utils/token_revocation");

        // Calculate or use the expiry time from the token
        const expiryTime = decoded.exp * 1000; // Convert to milliseconds

        // Add token to blacklist
        revokeToken(decoded.jti, expiryTime);

        console.log(
          `Token revoked for user ${decoded.email} (ID: ${decoded.id})`
        );
      }

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.log("Error decoding token during logout:", error);
      // Even if token is invalid, we want to tell the user they're logged out
      res.json({ success: true, message: "Logged out successfully" });
    }
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "An error occurred during logout" });
  }
});

module.exports = router;
