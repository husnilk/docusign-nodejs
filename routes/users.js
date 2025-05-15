const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyToken } = require("../middlewares/verify_token");
const { checkRole } = require("../middlewares/authorization");
const { hashPassword, verifyPassword } = require("../utils/auth");

const prisma = new PrismaClient();

/**
 * Get all users - Admin only
 * GET /users
 */
router.get("/", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { role, sort = "created_at", order = "desc" } = req.query;

    // Build the where clause
    const where = {};
    if (role) {
      where.role = role;
    }

    // Build the orderBy clause
    const orderBy = {};
    const validSortFields = ["created_at", "username", "email"];
    const validOrders = ["asc", "desc"];

    // Use provided sort field if valid, otherwise default to created_at
    const sortField = validSortFields.includes(sort) ? sort : "created_at";
    // Use provided order if valid, otherwise default to desc
    const sortOrder = validOrders.includes(order) ? order : "desc";

    orderBy[sortField] = sortOrder;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            documents: true,
            signatures: true,
          },
        },
      },
      orderBy,
    });

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * Search users - Admin only
 * GET /users/search?q={query}
 */
router.get("/search", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 2 characters" });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [{ username: { contains: q } }, { email: { contains: q } }],
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            documents: true,
            signatures: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

/**
 * Get a user by ID
 * GET /users/:id
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only view their own details unless they are admin
    const isAdmin = req.user.role === "admin";
    const isOwnProfile = req.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        error: "Access denied. You can only view your own profile.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            documents: true,
            signatures: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

/**
 * Create a new user - Admin only
 * POST /users
 */
router.post("/", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required" });
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        avatar,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * Update a user
 * PUT /users/:id
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, avatar, currentPassword, newPassword, role } =
      req.body;

    // Users can only update their own profiles unless they are admin
    const isAdmin = req.user.role === "admin";
    const isOwnProfile = req.user.id === userId;

    // If role is included in the request, reject it with a helpful message
    if (role) {
      return res.status(400).json({
        error:
          "Cannot update role through this endpoint. Use PUT /users/:id/role instead.",
      });
    }

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        error: "Access denied. You can only update your own profile.",
      });
    }

    // Get the current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare update data
    const updateData = {};

    if (username) updateData.username = username;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Email update requires admin or password verification
    if (email && email !== currentUser.email) {
      // Check if email is already taken
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(409).json({ error: "Email is already taken" });
      }

      // Only admin can change email without verification
      if (!isAdmin) {
        if (!currentPassword) {
          return res.status(400).json({
            error: "Current password is required to change email",
          });
        }

        const validPassword = await verifyPassword(
          currentPassword,
          currentUser.password
        );
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid current password" });
        }
      }

      updateData.email = email;
    }

    // Password update requires verification of current password
    if (newPassword) {
      // Admin doesn't need to provide current password
      if (!isAdmin) {
        if (!currentPassword) {
          return res.status(400).json({
            error: "Current password is required to change password",
          });
        }

        const validPassword = await verifyPassword(
          currentPassword,
          currentUser.password
        );
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid current password" });
        }
      }

      updateData.password = await hashPassword(newPassword);
    }

    // If there are updates to apply
    if (Object.keys(updateData).length > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          created_at: true,
          updated_at: true,
        },
      });

      res.json(updatedUser);
    } else {
      res.json({
        message: "No changes were provided",
        user: {
          id: currentUser.id,
          email: currentUser.email,
        },
      });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * Update user role - Admin only
 * PUT /users/:id/role
 */
router.put("/:id/role", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Validate role
    const validRoles = ["user", "manager", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Role must be one of: " + validRoles.join(", "),
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent changing role of primary admin
    if (
      user.email === "admin@docusign.local" &&
      user.role === "admin" &&
      role !== "admin"
    ) {
      return res.status(403).json({
        error: "Cannot change role of primary admin user",
      });
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Log the role change
    console.log(
      `User ${user.email} role changed from ${
        user.role || "user"
      } to ${role} by ${req.user.email}`
    );

    res.json({
      message: `User role updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

/**
 * Delete a user
 * DELETE /users/:id
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only delete their own accounts unless they are admin
    const isAdmin = req.user.role === "admin";
    const isOwnProfile = req.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        error: "Access denied. You can only delete your own account.",
      });
    }

    // Admins cannot delete their own account from this endpoint
    if (isAdmin && isOwnProfile) {
      return res.status(403).json({
        error:
          "Admins cannot delete their own account from this endpoint for security reasons.",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Handle user's signatures
    await prisma.signature.deleteMany({
      where: { user_id: userId },
    });

    // For documents, we have a decision to make:
    // 1. Delete all user's documents
    // 2. Transfer ownership to an admin
    // 3. Archive documents but keep them in the system

    // For this implementation, let's delete the user's documents first
    await prisma.document.deleteMany({
      where: { owner_id: userId },
    });

    // Now delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/**
 * Get user's documents
 * GET /users/:id/documents
 */
router.get("/:id/documents", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only see their own documents unless they are admin
    const isAdmin = req.user.role === "admin";
    const isOwnProfile = req.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        error: "Access denied. You can only view your own documents.",
      });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get documents
    const documents = await prisma.document.findMany({
      where: { owner_id: userId },
      include: {
        signatures: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(documents);
  } catch (error) {
    console.error("Error fetching user documents:", error);
    res.status(500).json({ error: "Failed to fetch user documents" });
  }
});

/**
 * Get user's signatures
 * GET /users/:id/signatures
 */
router.get("/:id/signatures", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only see their own signatures unless they are admin
    const isAdmin = req.user.role === "admin";
    const isOwnProfile = req.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        error: "Access denied. You can only view your own signatures.",
      });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get signatures with document info
    const signatures = await prisma.signature.findMany({
      where: { user_id: userId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            description: true,
            filename: true,
            owner: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(signatures);
  } catch (error) {
    console.error("Error fetching user signatures:", error);
    res.status(500).json({ error: "Failed to fetch user signatures" });
  }
});

/**
 * Batch operations on users - Admin only
 * POST /users/batch
 * Body: { operation: 'delete', userIds: [id1, id2, ...] }
 */
router.post("/batch", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    const { operation, userIds } = req.body;

    if (
      !operation ||
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return res.status(400).json({
        error: "Invalid request. Provide an operation and array of user IDs",
      });
    }

    // Check for admin emails in the userIds to prevent accidental deletion
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });

    const adminEmails = users
      .filter((user) => user.email === "admin@docusign.local")
      .map((user) => user.email);

    if (operation === "delete" && adminEmails.length > 0) {
      return res.status(403).json({
        error: "Cannot delete admin users through batch operations",
        adminEmails,
      });
    }

    let result;

    switch (operation) {
      case "delete":
        // First delete related records
        await prisma.signature.deleteMany({
          where: { user_id: { in: userIds } },
        });

        // Then delete users
        result = await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });

        res.json({
          operation: "delete",
          count: result.count,
          message: `Successfully deleted ${result.count} users`,
        });
        break;

      default:
        res.status(400).json({ error: `Unsupported operation: ${operation}` });
    }
  } catch (error) {
    console.error("Error performing batch operation on users:", error);
    res.status(500).json({ error: "Failed to perform batch operation" });
  }
});

/**
 * Get user statistics - Admin only
 * GET /users/stats
 */
router.get("/stats", verifyToken, checkRole(["admin"]), async (req, res) => {
  try {
    // Get total count
    const totalUsers = await prisma.user.count();

    // Get count of users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await prisma.user.count({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get count of users with documents
    const usersWithDocuments = await prisma.user.count({
      where: {
        documents: {
          some: {},
        },
      },
    });

    // Get count of users with signatures
    const usersWithSignatures = await prisma.user.count({
      where: {
        signatures: {
          some: {},
        },
      },
    });

    // Get most active users (by document count)
    const mostActiveUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        _count: {
          select: {
            documents: true,
            signatures: true,
          },
        },
      },
      orderBy: {
        documents: {
          _count: "desc",
        },
      },
      take: 5,
    });

    res.json({
      totalUsers,
      newUsers,
      usersWithDocuments,
      usersWithSignatures,
      mostActiveUsers,
    });
  } catch (error) {
    console.error("Error getting user statistics:", error);
    res.status(500).json({ error: "Failed to get user statistics" });
  }
});

/**
 * Verify user account (placeholder for future implementation)
 * POST /users/:id/verify
 */
router.post(
  "/:id/verify",
  verifyToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // In a real implementation, you might:
      // 1. Update a 'verified' field in the database
      // 2. Send a confirmation email
      // 3. Log the verification action

      // For now, we'll just return a success message
      res.json({
        message: `User ${user.email} would be verified here`,
        verified: true,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ error: "Failed to verify user" });
    }
  }
);

module.exports = router;
