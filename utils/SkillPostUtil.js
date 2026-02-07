const fs = require("fs");
const path = require("path");

const offersFile = path.join(__dirname, "..", "data", "offers.json");
const requestsFile = path.join(__dirname, "..", "data", "requests.json");

function log(level, msg, meta) {
  const time = new Date().toISOString();
  const safeMeta = meta ? JSON.stringify(meta) : "";
  console[level](`[SkillLink][UpdatePost][${time}] ${msg} ${safeMeta}`);
}

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function readJsonArray(file) {
  const parsed = readJson(file);
  if (!Array.isArray(parsed)) {
    return { items: [], coerced: true };
  }
  return { items: parsed, coerced: false };
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// Ensure each post has an id and normalized fields. If missing, add ids and write back.
function normalizeAndLoad() {
  const offersRead = readJsonArray(offersFile);
  const requestsRead = readJsonArray(requestsFile);

  const offers = offersRead.items.map((o) => ({
    id: o.id || null,
    userId: (o.userId ?? null),
    username: o.username || o.name || "",
    skill: o.skill || "",
    category: o.category || "",
    description: o.description || ""
  }));

  const requests = requestsRead.items.map((r) => ({
    id: r.id || null,
    userId: (r.userId ?? null),
    username: r.username || r.name || "",
    skill: r.skill || "",
    category: r.category || "",
    description: r.description || ""
  }));

  // assign ids where missing
  const all = offers.concat(requests);
  let maxId = all.reduce((m, p) => Math.max(m, p.id || 0), 0);
  let changed = offersRead.coerced || requestsRead.coerced;

  for (const list of [offers, requests]) {
    for (const item of list) {
      if (!item.id) {
        maxId += 1;
        item.id = maxId;
        changed = true;
      }
    }
  }

  if (changed) {
    // persist ids back to files with original shape (name instead of username where appropriate)
    const outOffers = offers.map(o => ({
      id: o.id,
      userId: o.userId ?? null,
      username: o.username,
      skill: o.skill,
      category: o.category,
      description: o.description
    }));
    const outRequests = requests.map(r => ({
      id: r.id,
      userId: r.userId ?? null,
      username: r.username,
      skill: r.skill,
      category: r.category,
      description: r.description
    }));
    writeJson(offersFile, outOffers);
    writeJson(requestsFile, outRequests);
  }

  return { offers, requests };
}

function viewPosts(req, res) {
  try {
    const db = normalizeAndLoad();
    res.json({ success: true, offers: db.offers || [], requests: db.requests || [] });
  } catch (err) {
    console.error("Error in viewPosts:", err);
    res.status(500).json({ success: false, message: "Server error while loading posts." });
  }
}

function updatePost(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { skill, category, description } = req.body || {};

    // (a) start log (after id parsed)
    log("log", "REQUEST_RECEIVED", { id, userId: req.user?.id || null });

    if (!skill || !String(skill).trim()) {
      log("warn", "VALIDATION_FAIL", { id, reason: "skill_required" });
      return res.status(400).json({ success: false, message: "Skill is required." });
    }
    if (!category || !String(category).trim()) {
      log("warn", "VALIDATION_FAIL", { id, reason: "category_required" });
      return res.status(400).json({ success: false, message: "Category is required." });
    }
    if (!description || !String(description).trim()) {
      log("warn", "VALIDATION_FAIL", { id, reason: "description_required" });
      return res.status(400).json({ success: false, message: "Description is required." });
    }

    const skillClean = String(skill).trim();
    const categoryClean = String(category).trim();
    const descriptionClean = String(description).trim();

    if (skillClean.length > 30) {
      log("warn", "VALIDATION_FAIL", { id, reason: "skill_too_long" });
      return res.status(400).json({ success: false, message: "Skill must be 30 characters or less." });
    }
    if (descriptionClean.length < 10) {
      log("warn", "VALIDATION_FAIL", { id, reason: "description_too_short" });
      return res.status(400).json({ success: false, message: "Description must be at least 10 characters." });
    }

    const db = normalizeAndLoad();
    const collections = [{ key: "offers", file: offersFile }, { key: "requests", file: requestsFile }];
    let found = false;

    for (const col of collections) {
      const list = db[col.key];
      const index = list.findIndex((p) => p.id === id);
      if (index !== -1) {
        const currentUserId = (req.user?.id || "").toString().trim();
        const ownerId = (list[index].userId ?? "").toString().trim();

        if (!currentUserId) {
          log("warn", "AUTH_FAIL", { id, reason: "not_logged_in" });
          return res.status(401).json({ success: false, message: "Please log in." });
        }
        if (!ownerId) {
          log("warn", "FORBIDDEN", { id, reason: "missing_owner_id" });
          return res.status(403).json({ success: false, message: "This post cannot be edited (missing owner id)." });
        }
        if (ownerId !== currentUserId) {
          log("warn", "FORBIDDEN", { id, reason: "not_owner", ownerId, userId: currentUserId });
          return res.status(403).json({ success: false, message: "You are not allowed to edit this post." });
        }

        list[index].skill = skillClean;
        list[index].category = categoryClean;
        list[index].description = descriptionClean;

        writeJson(col.file, list);

        // (b) success log
        log("log", "SUCCESS", { id, collection: col.key, userId: currentUserId });

        found = true;
        break;
      }
    }

    if (!found) {
      log("warn", "NOT_FOUND", { id });
      return res.status(404).json({ success: false, message: "Post not found." });
    }
    return res.json({ success: true, message: "Post updated successfully." });
  } catch (err) {
    log("error", "SERVER_ERROR", { id: req.params?.id, error: err.message });
    res.status(500).json({ success: false, message: "Server error while updating post." });
  }
}

function deletePost(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const db = normalizeAndLoad();
    const collections = [{ key: "offers", file: offersFile }, { key: "requests", file: requestsFile }];
    let found = false;

    for (const col of collections) {
      const list = db[col.key];
      const index = list.findIndex((p) => p.id === id);
      if (index !== -1) {
        const currentUserId = (req.user?.id || "").toString().trim();
        const ownerId = (list[index].userId ?? "").toString().trim();

        if (!currentUserId) {
          return res.status(401).json({ success: false, message: "Please log in." });
        }

        if (!ownerId) {
          return res.status(403).json({ success: false, message: "This post cannot be deleted (missing owner id)." });
        }

        if (ownerId !== currentUserId) {
          return res.status(403).json({ success: false, message: "You are not allowed to delete this post." });
        }

        list.splice(index, 1);
        writeJson(col.file, list);
        found = true;
        break;
      }
    }

    if (!found) return res.status(404).json({ success: false, message: "Post not found." });
    return res.json({ success: true, message: "Post deleted successfully." });
  } catch (err) {
    console.error("Error in deletePost:", err);
    res.status(500).json({ success: false, message: "Server error while deleting post." });
  }
}

module.exports = { viewPosts, updatePost, deletePost, __log: log };
