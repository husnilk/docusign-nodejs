// This script tests the role-based access control in the application
// Usage: node test-role-management.js

require("dotenv").config();
const axios = require("axios");
const url = "http://localhost:3000"; // Change if your server is on a different port

let adminToken;
let regularToken;
let managerToken;
let userId;

async function testRoleManagement() {
  try {
    console.log("=== Testing Role-Based Access Control ===");

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

    // Login as manager user
    console.log("\n3. Login as manager user");
    const managerLoginResponse = await axios.post(`${url}/auth/login`, {
      email: "bob@example.com",
      password: "password123",
    });

    managerToken = managerLoginResponse.data.token;
    console.log("Manager user login successful, token received");

    // Test 1: Admin access to list all users (should succeed)
    console.log("\n4. Admin access to list all users");
    try {
      const adminListResponse = await axios.get(`${url}/users`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      console.log(
        `Success! Admin can list all users: ${adminListResponse.data.length} users retrieved`
      );
    } catch (error) {
      console.error(
        "ERROR: Admin failed to list users:",
        error.response?.data || error.message
      );
    }

    // Test 2: Regular user access to list all users (should fail)
    console.log("\n5. Regular user access to list all users (should fail)");
    try {
      await axios.get(`${url}/users`, {
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      });
      console.error("ERROR: Regular user was able to list all users!");
    } catch (error) {
      console.log(
        "Success! Regular user was correctly denied access to list all users"
      );
    }

    // Test 3: Manager user access to list all users (should fail)
    console.log("\n6. Manager user access to list all users (should fail)");
    try {
      await axios.get(`${url}/users`, {
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
      });
      console.error("ERROR: Manager user was able to list all users!");
    } catch (error) {
      console.log(
        "Success! Manager user was correctly denied access to list all users"
      );
    }

    // Test 4: Create a new test user as admin (should succeed)
    console.log("\n7. Create new user as admin");
    let newUserId;
    try {
      const createResponse = await axios.post(
        `${url}/users`,
        {
          username: "testuser",
          email: "test-role@example.com",
          password: "password123",
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      newUserId = createResponse.data.id;
      console.log(
        "Success! Admin created new user:",
        createResponse.data.username
      );
    } catch (error) {
      console.error(
        "ERROR: Admin failed to create user:",
        error.response?.data || error.message
      );
    }

    // Test 5: Regular user updating their own profile (should succeed)
    console.log("\n8. Regular user updating own profile");
    try {
      const updateResponse = await axios.put(
        `${url}/users/${userId}`,
        {
          username: "john_updated_role_test",
        },
        {
          headers: {
            Authorization: `Bearer ${regularToken}`,
          },
        }
      );
      console.log(
        "Success! Regular user updated own profile:",
        updateResponse.data.username
      );
    } catch (error) {
      console.error(
        "ERROR: Regular user failed to update own profile:",
        error.response?.data || error.message
      );
    }

    // Test 6: Clean up - Delete test user if created (should succeed for admin)
    if (newUserId) {
      console.log("\n9. Admin deleting test user");
      try {
        await axios.delete(`${url}/users/${newUserId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        console.log("Success! Admin deleted test user");
      } catch (error) {
        console.error(
          "ERROR: Admin failed to delete test user:",
          error.response?.data || error.message
        );
      }
    }

    console.log("\n=== Role-Based Access Control Tests Completed ===");
  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

// Run the tests only if axios is installed
try {
  require.resolve("axios");
  testRoleManagement();
} catch (e) {
  console.error(
    "This script requires axios. Please install it with: npm install axios"
  );
}
