/**
 * Compatibility middleware: injects `success` field alongside the existing `status`
 * field so the Nouvak User App (which checks response.success / res.data.success)
 * works against this backend without any frontend changes.
 *
 * Rule:
 *   success = true  when HTTP status < 400
 *   success = false when HTTP status >= 400
 *
 * The original `status` boolean is preserved so existing Admin / Technician
 * clients that check `status` continue to work unchanged.
 */
const responseTransform = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      // Only inject if `success` is not already present
      if (body.success === undefined) {
        body.success = res.statusCode < 400;
      }
    }
    return originalJson(body);
  };

  next();
};

module.exports = responseTransform;
