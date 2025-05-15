// This script creates an admin user in the database
// Run this script with: node create-admin.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@docusign.local" },
    });

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt); // Create admin user with explicit admin role
    const admin = await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@docusign.local",
        password: hashedPassword,
        role: "admin",
      },
    });

    console.log("Admin user created successfully:", admin);
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
