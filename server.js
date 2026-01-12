const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const SkillPostUtil = require('./utils/SkillPostUtil');

const app = express();
const PORT = 3000;

app.use(express.json());  // Fixed: moved to top
app.use(express.static(path.join(__dirname, "public"))); // serve frontend

const USERS_FILE = path.join(__dirname, "utils", "skilllink.json");

function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const raw = fs.readFileSync(USERS_FILE, "utf8");
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error reading users file:", err);
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function makeToken(payload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function parseToken(token) {
    try {
        return JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

function logAuth(level, msg, meta = {}) {
  const time = new Date().toISOString();
  console[level](`[SkillLink][Auth][${time}] ${msg} ${JSON.stringify(meta)}`);
}

// Added: auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    logAuth("warn", "AUTH_FAIL", { path: req.path, reason: "missing_token" });
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const token = parts[1];
  const data = parseToken(token);

  if (!data || !data.id) {
    logAuth("warn", "AUTH_FAIL", { path: req.path, reason: "invalid_token" });
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  const users = loadUsers();
  const user = users.find((u) => u.id === data.id);

  if (!user) {
    logAuth("warn", "AUTH_FAIL", { path: req.path, reason: "user_not_found", userId: data.id });
    return res.status(401).json({ success: false, message: "User not found" });
  }

  req.user = { id: user.id, username: user.username };
  logAuth("log", "AUTH_OK", { path: req.path, userId: user.id, username: user.username });
  next();
}

app.post("/api/register", async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "username and password required"
        });
    }

    const users = loadUsers();

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(409).json({
            success: false,
            message: "Username already taken"
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = Date.now().toString();

    const user = { id, username, passwordHash };
    users.push(user);
    saveUsers(users);

    const token = makeToken({ id: user.id, username: user.username });

    res.json({
        success: true,
        user: { id: user.id, username: user.username },
        token
    });
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "username and password required"
        });
    }

    const users = loadUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user)
        return res.status(401).json({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match)
        return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = makeToken({ id: user.id, username: user.username });

    res.json({
        success: true,
        user: { id: user.id, username: user.username },
        token
    });
});

app.get("/api/me", (req, res) => {
    const auth = req.headers.authorization || "";
    const parts = auth.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer")
        return res.status(401).json({ success: false });

    const token = parts[1];
    const data = parseToken(token);

    if (!data || !data.id)
        return res.status(401).json({ success: false });

    const users = loadUsers();
    const user = users.find(u => u.id === data.id);

    if (!user)
        return res.status(404).json({ success: false });

    res.json({
        success: true,
        user: { id: user.id, username: user.username }
    });
});

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

ensureFile(offersFile, [
    { name: "John", skill: "Python" },
    { name: "Mary", skill: "Guitar" }
]);

ensureFile(requestsFile, [
    { name: "Alex", skill: "Piano" },
    { name: "Lisa", skill: "Cooking" }
]);

function loadJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
        return [];
    }
}

function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// Compute next id from both files
function getNextId() {
    const offers = loadJson(offersFile) || [];
    const requests = loadJson(requestsFile) || [];
    const all = offers.concat(requests);
    const maxId = all.reduce((m, p) => Math.max(m, p.id || 0), 0);
    return maxId + 1;
}

// Normalize data files: ensure id and username fields exist; write back if changed
function normalizeDataFiles() {
    const offersRaw = loadJson(offersFile);
    const requestsRaw = loadJson(requestsFile);

    const offers = offersRaw.map(o => ({
        id: o.id || null,
        userId: (o.userId ?? null),
        username: o.username || o.name || "",
        skill: o.skill || "",
        category: o.category || "",
        description: o.description || ""
    }));

    const requests = requestsRaw.map(r => ({
        id: r.id || null,
        userId: (r.userId ?? null),
        username: r.username || r.name || "",
        skill: r.skill || "",
        category: r.category || "",
        description: r.description || ""
    }));

    let maxId = offers.concat(requests).reduce((m, p) => Math.max(m, p.id || 0), 0);
    let changed = false;

    for (const list of [offers, requests]) {
        for (const item of list) {
            if (!item.id) { maxId += 1; item.id = maxId; changed = true; }
        }
    }

    if (changed) {
        // write back normalized shapes (keep userId + username)
        saveJson(
          offersFile,
          offers.map(o => ({
            id: o.id,
            userId: o.userId ?? null,
            username: o.username,
            skill: o.skill,
            category: o.category,
            description: o.description
          }))
        );
        saveJson(
          requestsFile,
          requests.map(r => ({
            id: r.id,
            userId: r.userId ?? null,
            username: r.username,
            skill: r.skill,
            category: r.category,
            description: r.description
          }))
        );
    }

    return { offers, requests };
}

// Offers API
app.get("/api/offers", (req, res) => {
    const db = normalizeDataFiles();
    res.json(db.offers);
});

// CHANGE: requireAuth + validation for skill, category, and description
app.post("/api/offers", requireAuth, (req, res) => {
  const { skill, category, description } = req.body || {};

  if (!skill || !String(skill).trim()) {
    return res.status(400).json({ success: false, message: "Skill is required." });
  }
  if (!category || !String(category).trim()) {
    return res.status(400).json({ success: false, message: "Category is required." });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ success: false, message: "Description is required." });
  }

  const skillClean = String(skill).trim();
  const categoryClean = String(category).trim();
  const descriptionClean = String(description).trim();

  if (skillClean.length > 30) {
    return res.status(400).json({ success: false, message: "Skill must be 30 characters or less." });
  }
  if (descriptionClean.length < 10) {
    return res.status(400).json({ success: false, message: "Description must be at least 10 characters." });
  }

  const offers = loadJson(offersFile);
  const id = getNextId();

  const newPost = {
    id,
    userId: req.user.id,
    username: req.user.username,
    skill: skillClean,
    category: categoryClean,
    description: descriptionClean,
  };

  offers.push(newPost);
  saveJson(offersFile, offers);

  return res.status(201).json({ success: true, message: "Offer added", post: newPost });
});

app.get("/api/requests", (req, res) => {
    const db = normalizeDataFiles();
    res.json(db.requests);
});

// CHANGE: requireAuth + validation for skill, category, and description
app.post("/api/requests", requireAuth, (req, res) => {
  const { skill, category, description } = req.body || {};

  if (!skill || !String(skill).trim()) {
    return res.status(400).json({ success: false, message: "Skill is required." });
  }
  if (!category || !String(category).trim()) {
    return res.status(400).json({ success: false, message: "Category is required." });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ success: false, message: "Description is required." });
  }

  const skillClean = String(skill).trim();
  const categoryClean = String(category).trim();
  const descriptionClean = String(description).trim();

  if (skillClean.length > 30) {
    return res.status(400).json({ success: false, message: "Skill must be 30 characters or less." });
  }
  if (descriptionClean.length < 10) {
    return res.status(400).json({ success: false, message: "Description must be at least 10 characters." });
  }

  const requests = loadJson(requestsFile);
  const id = getNextId();

  const newPost = {
    id,
    userId: req.user.id,
    username: req.user.username,
    skill: skillClean,
    category: categoryClean,
    description: descriptionClean,
  };

  requests.push(newPost);
  saveJson(requestsFile, requests);

  return res.status(201).json({ success: true, message: "Request added", post: newPost });
});

// View all posts
app.get('/api/posts', SkillPostUtil.viewPosts);

// Update a post (now requires login)
app.put("/api/posts/:id", requireAuth, SkillPostUtil.updatePost);

// Delete a post (now requires login)
app.delete("/api/posts/:id", requireAuth, SkillPostUtil.deletePost);

app.listen(PORT, () => {
    console.log(`Merged SkillLink server running at http://localhost:${PORT}`);
});