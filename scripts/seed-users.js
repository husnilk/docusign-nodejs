// This script creates sample users for testing
// Run this script with: node seed-users.js

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function seedUsers() {
  try {
    console.log("Starting to seed users...");
    // Create sample users
    const users = [
      {
        username: "john_doe",
        email: "john@example.com",
        password: "password123",
        avatar: "https://ui-avatars.com/api/?name=John+Doe",
        role: "user",
      },
      {
        username: "jane_smith",
        email: "jane@example.com",
        password: "password123",
        avatar: "https://ui-avatars.com/api/?name=Jane+Smith",
        role: "user",
      },
      {
        username: "bob_johnson",
        email: "bob@example.com",
        password: "password123",
        avatar: "https://ui-avatars.com/api/?name=Bob+Johnson",
        role: "manager",
      },
    ];

    // Hash passwords and create users
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          console.log(`User with email ${user.email} already exists, skipping`);
          return existingUser;
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);

        // Create user
        return prisma.user.create({
          data: {
            username: user.username,
            email: user.email,
            password: hashedPassword,
            avatar: user.avatar,
            role: user.role || "user",
          },
        });
      })
    );

    console.log(
      `${hashedUsers.length} users have been created or already existed`
    );

    // Make sure we have an admin user
    const adminExists = await prisma.user.findUnique({
      where: { email: "admin@docusign.local" },
    });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);
      await prisma.user.create({
        data: {
          username: "admin",
          email: "admin@docusign.local",
          password: hashedPassword,
          avatar: "https://ui-avatars.com/api/?name=Admin+User",
          role: "admin",
        },
      });

      console.log("Admin user created");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUsers();
