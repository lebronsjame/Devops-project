const request = require("supertest");
const fs = require("fs");
const path = require("path");
const app = require("../server");

// files used by your app
const offersFile = path.join(__dirname, "..", "data", "offers.json");
const requestsFile = path.join(__dirname, "..", "data", "requests.json");
const usersFile = path.join(__dirname, "..", "utils", "skilllink.json");

// helper: create a token the same way as server.js
function makeToken(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function readJson(p) {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8");
  return raw ? JSON.parse(raw) : [];
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

describe("PUT /api/posts/:id (Update Post)", () => {
  let myUser;
  let myToken;
  let myPostId;
  let otherUser;
  let otherToken;

  beforeAll(() => {
    // backup existing files
    const backup = (file) => {
      const b = file + ".bak_test";
      if (fs.existsSync(file)) fs.copyFileSync(file, b);
    };
    [offersFile, requestsFile, usersFile].forEach(backup);
  });

  afterAll(() => {
    // restore backups
    const restore = (file) => {
      const b = file + ".bak_test";
      if (fs.existsSync(b)) fs.copyFileSync(b, file);
      if (fs.existsSync(b)) fs.unlinkSync(b);
    };
    [offersFile, requestsFile, usersFile].forEach(restore);
  });

  beforeEach(() => {
    // seed users
    myUser = { id: "u1", username: "pavian", passwordHash: "x" };
    otherUser = { id: "u2", username: "alex", passwordHash: "x" };
    writeJson(usersFile, [myUser, otherUser]);

    myToken = makeToken({ id: myUser.id, username: myUser.username });
    otherToken = makeToken({ id: otherUser.id, username: otherUser.username });

    // seed offers with one post owned by pavian
    const offers = [
      {
        id: 11,
        userId: myUser.id,
        username: myUser.username,
        skill: "OldSkill",
        category: "OldCat",
        description: "Old description text"
      }
    ];
    writeJson(offersFile, offers);
    writeJson(requestsFile, []);

    myPostId = 11;
  });

  test("200 success when owner updates with valid fields", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({
        skill: "Python",
        category: "Programming",
        description: "This is a valid description."
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const offersNow = readJson(offersFile);
    expect(offersNow[0].skill).toBe("Python");
  });

  test("400 when category is empty", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({
        skill: "Python",
        category: "",
        description: "This is a valid description."
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("401 when token missing", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .send({
        skill: "Python",
        category: "Programming",
        description: "This is a valid description."
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("403 when not owner", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        skill: "Python",
        category: "Programming",
        description: "This is a valid description."
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test("404 when post not found", async () => {
    const res = await request(app)
      .put(`/api/posts/999999`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({
        skill: "Python",
        category: "Programming",
        description: "This is a valid description."
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("400 when skill is too long", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({
        skill: "A".repeat(31),
        category: "Programming",
        description: "Valid long enough description"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/30 characters/i);
  });

  test("400 when description is too short", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({
        skill: "Python",
        category: "Programming",
        description: "short"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/at least 10/i);
  });

  test("400 when description is missing", async () => {
    const res = await request(app)
      .put(`/api/posts/${myPostId}`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({
        skill: "Python",
        category: "Programming",
        description: ""
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
