const jwt = require('jsonwebtoken');
const env = require('../config/env');

const UNIVERSITY_TOKEN_EXPIRE = '7d';

function generateUniversityToken(universityId, status) {
  return jwt.sign(
    { id: universityId, role: 'university', status },
    env.jwtSecret,
    { expiresIn: UNIVERSITY_TOKEN_EXPIRE }
  );
}

module.exports = {
  generateUniversityToken,
  UNIVERSITY_TOKEN_EXPIRE
};
