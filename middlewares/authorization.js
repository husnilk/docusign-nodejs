const { verifyToken } = require("./verify_token");

/**
 * Middleware to verify user roles
 * This must be used after verifyToken middleware
 *
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} - Express middleware function
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // verifyToken must be called before this middleware
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required before role verification",
      });
    }

    // Get user role from user object (added in verifyToken middleware)
    const userRole = req.user.role || "user";

    // Check if user's role is included in allowed roles
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
        error: "Access denied. Insufficient permissions.",
      });
    }
  };
};

/**
 * Middleware to restrict access to resource owners only
 * Checks if the authenticated user is the owner of a resource
 *
 * @param {Function} getResourceOwnerIdFn - Function to get resource owner ID from request
 * @returns {Function} - Express middleware function
 */
const checkOwnership = (getResourceOwnerIdFn) => {
  return async (req, res, next) => {
    // verifyToken must be called before this middleware
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required before ownership verification",
      });
    }

    try {
      // Get the owner ID of the requested resource
      const ownerId = await getResourceOwnerIdFn(req);

      // Check if the authenticated user is the owner
      if (req.user.id === ownerId) {
        next();
      } else {
        res.status(403).json({
          error: "Access denied. You are not the owner of this resource.",
        });
      }
    } catch (error) {
      console.error("Ownership check error:", error);
      res.status(500).json({
        error: "Internal server error during ownership verification",
      });
    }
  };
};

module.exports = {
  checkRole,
  checkOwnership,
};
