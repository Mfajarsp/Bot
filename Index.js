const express = require('express');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'https://cryptobtccoin.com';
const DB = './akun.json';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

let activeTokens = {};

// Load akun
function loadAkun() {
  if (!fs.existsSync(DB)) return [];
  return JSON.parse(fs.readFileSync(DB));
}

// Save akun
function saveAkun(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Token system
function createToken() {
  const token = uuidv4();
  activeTokens[token] = Date.now() + (2 * 60 * 60 * 1000);
  return token;
}
function validateToken(token) {
  const expire = activeTokens[token];
  if (!expire || expire < Date.now()) return false;
  return true;
}
function cleanupTokens() {
  for (const token in activeTokens) {
    if (activeTokens[token] < Date.now()) delete activeTokens[token];
  }
}
setInterval(cleanupTokens, 5 * 60 * 1000);

// Farming core
async function getUserInfo(headers) {
  const res = await axios.post(`${BASE_URL}/qyEr/userInfo`, {}, { headers });
  return res.data.data;
}
async function klaimNFT(headers) {
  const res = await axios.post(`${BASE_URL}/qyCt/btcList`, { type: "free" }, { headers });
  const nft = res.data.data.find(n => n.id === 1);
  if (!nft || nft.remainSecond > 0 || nft.active) return;
  await axios.post(`${BASE_URL}/qyCt/mineNft`, {}, { headers });
  await axios.post(`${BASE_URL}/qyCt/active`, { nid: "1" }, { headers });
}
async function klaimAds(headers) {
  const info = await getUserInfo(headers);
  if (parseInt(info?.adShowed || 0) >= 10) return;
  await axios.post(`${BASE_URL}/qyEr/showAd`, {}, { headers });
  await sleep(10000);
  for (let i = 0; i < 10; i++) {
    await axios.post(`${BASE_URL}/qyEr/claimAd`, {}, { headers });
    await sleep(1000 + Math.floor(Math.random() * 5000));
  }
}
async function farmingLoop() {
  while (true) {
    const akunList = loadAkun();
    for (let akun of akunList) {
      const headers = {
        'Content-Type': 'application/json',
        'appVersion': '126',
        'deviceCountry': 'ID',
        'User-Agent': 'okhttp/4.12.0',
        'token': akun.token,
        'deviceId': akun.deviceId
      };
      await klaimAds(headers);
      await klaimNFT(headers);
    }
    await sleep(10 * 60 * 1000);
  }
}

// ENDPOINTS

app.get('/get-token', (req, res) => {
  const token = createToken();
  res.json({ token, expires_in: '2 jam' });
});

app.post('/farming', (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });
  farmingLoop();
  res.json({ status: 'Farming 24 jam berjalan.' });
});

app.post('/claim-ads', async (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });

  const akunList = loadAkun();
  for (let akun of akunList) {
    const headers = {
      'Content-Type': 'application/json',
      'appVersion': '126',
      'deviceCountry': 'ID',
      'User-Agent': 'okhttp/4.12.0',
      'token': akun.token,
      'deviceId': akun.deviceId
    };
    await klaimAds(headers);
  }
  res.json({ status: 'Selesai klaim ads manual.' });
});

app.post('/claim-nft', async (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });

  const akunList = loadAkun();
  for (let akun of akunList) {
    const headers = {
      'Content-Type': 'application/json',
      'appVersion': '126',
      'deviceCountry': 'ID',
      'User-Agent': 'okhttp/4.12.0',
      'token': akun.token,
      'deviceId': akun.deviceId
    };
    await klaimNFT(headers);
  }
  res.json({ status: 'Selesai klaim NFT manual.' });
});

app.get('/cek-saldo', async (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });

  const akunList = loadAkun();
  const result = [];
  for (let akun of akunList) {
    const headers = {
      'Content-Type': 'application/json',
      'appVersion': '126',
      'deviceCountry': 'ID',
      'User-Agent': 'okhttp/4.12.0',
      'token': akun.token,
      'deviceId': akun.deviceId
    };
    try {
      const info = await getUserInfo(headers);
      result.push({ btc: info.btc, speed: info.speed });
    } catch {
      result.push({ error: 'Gagal ambil saldo.' });
    }
  }
  res.json(result);
});

app.post('/tambah-akun', (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });

  const { tokenBaru, deviceId, email } = req.body;
  const akunList = loadAkun();
  akunList.push({ token: tokenBaru, deviceId, email });
  saveAkun(akunList);
  res.json({ status: 'Akun ditambahkan.' });
});

app.post('/update-akun', (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });

  const { index, tokenBaru, deviceIdBaru } = req.body;
  const akunList = loadAkun();
  if (index < 0 || index >= akunList.length) return res.json({ error: 'Index akun tidak valid.' });

  akunList[index].token = tokenBaru;
  akunList[index].deviceId = deviceIdBaru;
  saveAkun(akunList);
  res.json({ status: 'Akun diperbarui.' });
});

app.post('/hapus-akun', (req, res) => {
  const { token } = req.query;
  if (!validateToken(token)) return res.status(401).json({ error: 'Token tidak valid.' });

  const { index } = req.body;
  const akunList = loadAkun();
  if (index < 0 || index >= akunList.length) return res.json({ error: 'Index akun tidak valid.' });

  akunList.splice(index, 1);
  saveAkun(akunList);
  res.json({ status: 'Akun dihapus.' });
});

app.listen(PORT, () => {
  console.log(`API berjalan di port ${PORT}`);
});
