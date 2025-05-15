// This script tests the ability to update user roles in the system
// Usage: node test-role-update.js

require("dotenv").config();
const axios = require("axios");
const url = "http://localhost:3000"; // Change if your server is on a different port

let adminToken;
let testUserId;

async function testRoleUpdate() {
  try {
    console.log("=== Testing User Role Update Functionality ===");

    // Login as admin
    console.log("\n1. Login as admin");
    const adminLoginResponse = await axios.post(`${url}/auth/login`, {
      email: "admin@docusign.local",
      password: "admin123",
    });

    adminToken = adminLoginResponse.data.token;
    console.log("Admin login successful, token received");

    // Create a test user with basic role
    console.log("\n2. Creating a test user");
    const createUserResponse = await axios.post(
      `${url}/users`,
      {
        username: "roletest",
        email: "roletest@example.com",
        password: "password123",
        avatar: "https://ui-avatars.com/api/?name=Role+Test",
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    testUserId = createUserResponse.data.id;
    console.log(`Test user created with ID: ${testUserId}`);

    // Verify the test user has default role 'user'
    console.log("\n3. Verifying default role");
    const getUserResponse = await axios.get(`${url}/users/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log(
      `Current user role: ${getUserResponse.data.role || "user (default)"}`
    );

    // Update the user's role to 'manager'
    console.log("\n4. Updating user role to manager");
    try {
      const updateResponse = await axios.put(
        `${url}/users/${testUserId}/role`,
        {
          role: "manager",
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      console.log("Role update response:", updateResponse.data);
    } catch (error) {
      console.error(
        "ERROR: Failed to update role:",
        error.response?.data || error.message
      );
      if (error.response?.status === 404) {
        console.log(
          "INFO: Role update endpoint not found. Let's implement it!"
        );
      }
    }

    // Clean up - delete the test user
    console.log("\n5. Cleaning up - deleting test user");
    await axios.delete(`${url}/users/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    console.log("Test user deleted successfully");
    console.log("\n=== Role Update Test Completed ===");
  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

// Run the tests only if axios is installed
try {
  require.resolve("axios");
  testRoleUpdate();
} catch (e) {
  console.error(
    "This script requires axios. Please install it with: npm install axios"
  );
}
