const crypto = require('crypto');

const tokens = {};

// Generate token random & set expired 2 jam
function generateToken() {
  const token = crypto.randomBytes(16).toString('hex');
  const expireTime = Date.now() + (2 * 60 * 60 * 1000); // 2 jam

  tokens[token] = expireTime;

  // Auto hapus token setelah expired
  setTimeout(() => {
    delete tokens[token];
  }, 2 * 60 * 60 * 1000);

  return token;
}

function getTokenList() {
  return Object.keys(tokens).map(token => ({
    token,
    expired_at: new Date(tokens[token]).toISOString()
  }));
}

module.exports = { generateToken, getTokenList };
