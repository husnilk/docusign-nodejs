// This script tests the user API endpoints
// Usage: node test-user-api.js

require("dotenv").config();
const axios = require("axios");
const url = "http://localhost:3000"; // Change if your server is on a different port

let adminToken;
let regularToken;
let userId;

async function testUserAPI() {
  try {
    console.log("=== Testing User Management API ===");

    // Login as admin
    console.log("\n1. Login as admin");
    const adminLoginResponse = await axios.post(`${url}/auth/login`, {
      email: "admin@docusign.local",
      password: "admin123",
    });

    adminToken = adminLoginResponse.data.token;
    console.log("Admin login successful, token received");

    // Login as regular user
    console.log("\n2. Login as regular user");
    const regularLoginResponse = await axios.post(`${url}/auth/login`, {
      email: "john@example.com",
      password: "password123",
    });

    regularToken = regularLoginResponse.data.token;
    userId = regularLoginResponse.data.user.id;
    console.log("Regular user login successful, token received");

    // List users as admin
    console.log("\n3. List all users as admin");
    const listResponse = await axios.get(`${url}/users`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log(`Successfully retrieved ${listResponse.data.length} users`);

    // List users as regular user (should fail)
    console.log("\n4. List all users as regular user (should fail)");
    try {
      await axios.get(`${url}/users`, {
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      });
      console.log("ERROR: Regular user was able to list all users");
    } catch (error) {
      console.log("Success: Regular user was denied access to list all users");
    }

    // Get user profile
    console.log("\n5. Get own user profile");
    const profileResponse = await axios.get(`${url}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${regularToken}`,
      },
    });

    console.log(
      "User profile retrieved successfully:",
      profileResponse.data.username
    );

    // Update user profile
    console.log("\n6. Update user profile");
    const updateResponse = await axios.put(
      `${url}/users/${userId}`,
      {
        username: "john_updated",
        avatar: "https://ui-avatars.com/api/?name=John+Updated",
      },
      {
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      }
    );

    console.log(
      "User profile updated successfully:",
      updateResponse.data.username
    );

    // Get user documents
    console.log("\n7. Get user documents");
    const documentsResponse = await axios.get(
      `${url}/users/${userId}/documents`,
      {
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      }
    );

    console.log(
      `Retrieved ${documentsResponse.data.length} documents for user`
    );

    // Create a new user as admin
    console.log("\n8. Create new user as admin");
    const newUser = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      avatar: "https://ui-avatars.com/api/?name=Test+User",
    };

    const createResponse = await axios.post(`${url}/users`, newUser, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log("New user created:", createResponse.data.username);
    const newUserId = createResponse.data.id;

    // Delete the newly created user
    console.log("\n9. Delete user as admin");
    const deleteResponse = await axios.delete(`${url}/users/${newUserId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log("User deleted successfully");

    console.log("\n=== All tests completed successfully ===");
  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

// Only run this if axios is installed
try {
  require.resolve("axios");
  testUserAPI();
} catch (e) {
  console.error(
    "This script requires axios. Please install it with: npm install axios"
  );
}
