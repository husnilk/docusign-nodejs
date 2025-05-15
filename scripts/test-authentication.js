// This script tests the authentication system with token refresh and logout
// Usage: node test-authentication.js

require("dotenv").config();
const axios = require("axios");
const url = "http://localhost:3000"; // Change if your server is on a different port

let adminToken;
let refreshedToken;

async function testAuthentication() {
  try {
    console.log("=== Testing Authentication System ===");

    // 1. Login as admin
    console.log("\n1. Login as admin");
    const loginResponse = await axios.post(`${url}/auth/login`, {
      email: "admin@docusign.local",
      password: "admin123",
    });

    adminToken = loginResponse.data.token;
    const expiresAt = loginResponse.data.expiresAt;

    console.log(`Admin login successful! Token received.`);
    console.log(`Token expires at: ${new Date(expiresAt).toLocaleString()}`);
    console.log(`User role: ${loginResponse.data.user.role}`);

    // 2. Use the token to access a protected endpoint
    console.log("\n2. Accessing protected endpoint (user profile) with token");
    try {
      const profileResponse = await axios.get(`${url}/profile/me`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      console.log("Profile access successful:", profileResponse.data.email);
    } catch (error) {
      console.error(
        "Error accessing profile:",
        error.response?.data || error.message
      );
    }

    // 3. Refresh the token
    console.log("\n3. Refreshing token");
    try {
      const refreshResponse = await axios.post(
        `${url}/tokens/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      refreshedToken = refreshResponse.data.token;
      const newExpiresAt = refreshResponse.data.expiresAt;

      console.log("Token refreshed successfully!");
      console.log(
        `New token expires at: ${new Date(newExpiresAt).toLocaleString()}`
      );
    } catch (error) {
      console.error(
        "Error refreshing token:",
        error.response?.data || error.message
      );
    }

    // 4. Validate the token
    console.log("\n4. Validating refreshed token");
    try {
      const validateResponse = await axios.get(`${url}/tokens/validate`, {
        headers: {
          Authorization: `Bearer ${refreshedToken || adminToken}`,
        },
      });

      console.log("Token validation response:", validateResponse.data.valid);
      console.log("User in token:", validateResponse.data.user.email);
    } catch (error) {
      console.error(
        "Error validating token:",
        error.response?.data || error.message
      );
    }

    // 5. Logout to revoke the token
    console.log("\n5. Logging out (revoking token)");
    try {
      const logoutResponse = await axios.post(
        `${url}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshedToken || adminToken}`,
          },
        }
      );

      console.log("Logout response:", logoutResponse.data.message);
    } catch (error) {
      console.error(
        "Error during logout:",
        error.response?.data || error.message
      );
    }

    // 6. Try to use the revoked token
    console.log("\n6. Trying to use the revoked token (should fail)");
    try {
      await axios.get(`${url}/profile/me`, {
        headers: {
          Authorization: `Bearer ${refreshedToken || adminToken}`,
        },
      });

      console.error("ERROR: Token still valid after logout!");
    } catch (error) {
      console.log(
        "Success! Token was properly revoked:",
        error.response?.data?.error || error.message
      );
    }

    console.log("\n=== Authentication System Test Completed ===");
  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

// Run the tests only if axios is installed
try {
  require.resolve("axios");
  testAuthentication();
} catch (e) {
  console.error(
    "This script requires axios. Please install it with: npm install axios"
  );
}
