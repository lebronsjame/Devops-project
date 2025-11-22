const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple health endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

const USERS_FILE = path.join(__dirname, 'utils', 'skilllink.json');

function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const raw = fs.readFileSync(USERS_FILE, 'utf8');
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading users file:', err);
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function makeToken(payload) {
    // Very small, non-cryptographic token for demo purposes only
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function parseToken(token) {
    try {
        return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    } catch (e) {
        return null;
    }
}

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'username and password required' });
    }

    const users = loadUsers();
    if (users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = Date.now().toString();
    const user = { id, username, passwordHash };
    users.push(user);
    saveUsers(users);

    const token = makeToken({ id: user.id, username: user.username, ts: Date.now() });
    return res.json({ success: true, user: { id: user.id, username: user.username }, token });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'username and password required' });
    }

    const users = loadUsers();
    const user = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = makeToken({ id: user.id, username: user.username, ts: Date.now() });
    return res.json({ success: true, user: { id: user.id, username: user.username }, token });
});

// Get current user (simple token parsing)
app.get('/api/me', (req, res) => {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ success: false });
    const token = parts[1];
    const data = parseToken(token);
    if (!data || !data.id) return res.status(401).json({ success: false });

    const users = loadUsers();
    const user = users.find(u => u.id === data.id);
    if (!user) return res.status(404).json({ success: false });

    return res.json({ success: true, user: { id: user.id, username: user.username } });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const dataDir = path.join(__dirname, "data");
const offersFile = path.join(dataDir, "offers.json");
const requestsFile = path.join(dataDir, "requests.json");

function ensureFile(filePath, defaultData) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

ensureFile(offersFile, [
  { "name": "John", "skill": "Python" },
  { "name": "Mary", "skill": "Guitar" }
]);

ensureFile(requestsFile, [
  { "name": "Alex", "skill": "Piano" },
  { "name": "Lisa", "skill": "Cooking" }
]);

let offers = loadJson(offersFile);
let requests = loadJson(requestsFile);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/offers", (req, res) => {
  offers = loadJson(offersFile);
  res.json(offers);
});

app.post("/api/offers", (req, res) => {
  const { name, skill } = req.body;
  const newOffer = { name, skill };
  offers.push(newOffer);
  saveJson(offersFile, offers);
  res.status(201).json({ message: "Offer added" });
});

app.get("/api/requests", (req, res) => {
  requests = loadJson(requestsFile);
  res.json(requests);
});

app.post("/api/requests", (req, res) => {
  const { name, skill } = req.body;
  const newRequest = { name, skill };
  requests.push(newRequest);
  saveJson(requestsFile, requests);
  res.status(201).json({ message: "Request added" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
})});
