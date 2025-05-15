const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { verifyToken } = require("../middlewares/verify_token");
const { checkOwnership } = require("../middlewares/authorization");
const prisma = new PrismaClient();

// Helper function to get document owner ID for authorization check
const getDocumentOwnerId = async (req) => {
  const docId = req.params.id;

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { owner_id: true },
  });

  if (!doc) {
    throw new Error("Document not found");
  }

  return doc.owner_id;
};

// Get all documents that belong to the authenticated user
router.get("/", verifyToken, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { owner_id: req.user.id },
          {
            private: false,
            signatures: {
              some: { user_id: req.user.id },
            },
          },
        ],
      },
      orderBy: { created_at: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Get a specific document by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.user.id;

    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check if user has access to this document
    // Users can access documents they own or documents where they are a signer
    const isOwner = document.owner_id === userId;
    const isSigner = document.signatures.some((sig) => sig.user_id === userId);

    if (!(isOwner || (isSigner && !document.private))) {
      return res.status(403).json({ error: "Access denied to this document" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// Create a new document
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      originalName,
      filename,
      private = false,
    } = req.body;

    // Validate required fields
    if (!title || !originalName || !filename) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newDocument = await prisma.document.create({
      data: {
        title,
        description,
        originalName,
        filename,
        private,
        owner_id: req.user.id,
      },
    });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// Update a document (owner only)
router.put(
  "/:id",
  verifyToken,
  checkOwnership(getDocumentOwnerId),
  async (req, res) => {
    try {
      const docId = req.params.id;
      const { title, description, private } = req.body;

      const updatedDocument = await prisma.document.update({
        where: { id: docId },
        data: {
          title,
          description,
          private,
        },
      });

      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  }
);

// Delete a document (owner only)
router.delete(
  "/:id",
  verifyToken,
  checkOwnership(getDocumentOwnerId),
  async (req, res) => {
    try {
      const docId = req.params.id;

      // Check for signatures first and delete them
      await prisma.signature.deleteMany({
        where: { document_id: docId },
      });

      // Now delete the document
      await prisma.document.delete({
        where: { id: docId },
      });

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  }
);

module.exports = router;
