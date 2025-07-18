const express = require('express');
const crypto = require('crypto');
const app = express();

const tokens = {};

function generateToken() {
  const token = crypto.randomBytes(16).toString('hex');
  const expire = Date.now() + (2 * 60 * 60 * 1000);
  tokens[token] = expire;
  return token;
}

app.get('/get-token', (req, res) => {
  const token = generateToken();
  res.json({ token, expired_in_seconds: 7200 });
});

app.get('/validate/:token', (req, res) => {
  const { token } = req.params;
  const valid = tokens[token] && tokens[token] > Date.now();
  res.json({ valid });
});

app.listen(3000, () => console.log('Token API Ready'));
