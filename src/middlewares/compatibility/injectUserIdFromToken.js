/**
 * Injects req.params.userId and req.body.userId from the authenticated token
 * so controllers that expect a :userId URL param work correctly on the
 * token-based (no-param) production-style routes.
 *
 * Must run AFTER userAuthenticateToken (req.user._id must already be set).
 */
const injectUserIdFromToken = (req, res, next) => {
  if (req.user && req.user._id) {
    req.params.userId = req.user._id.toString();
    // Some controllers also read from body
    if (req.body && req.body.userId === undefined) {
      req.body.userId = req.user._id.toString();
    }
  }
  next();
};

module.exports = injectUserIdFromToken;
