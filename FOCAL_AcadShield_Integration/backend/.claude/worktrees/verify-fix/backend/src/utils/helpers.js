function normalizeDomain(value = '') {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Escape user-supplied strings before interpolating them into a RegExp —
// prevents both RegExp syntax errors (500s) and catastrophic backtracking (ReDoS).
function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  asyncHandler,
  escapeRegex,
  normalizeDomain
};
