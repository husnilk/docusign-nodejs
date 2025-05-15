const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/verify_token");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Protected route example - requires authentication
router.get("/me", verifyToken, async (req, res) => {
  try {
    // req.user was added by the verifyToken middleware
    const userId = req.user.id;

    // Get complete user profile with related documents
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: {
          orderBy: {
            created_at: "desc",
          },
        },
      },
    });

    // Remove sensitive information
    delete userProfile.password;

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching profile data" });
  }
});

module.exports = router;
