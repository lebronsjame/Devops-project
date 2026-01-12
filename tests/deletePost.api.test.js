const request = require("supertest");
const fs = require("fs");
const path = require("path");
const app = require("../server");

const offersFile = path.join(__dirname, "..", "data", "offers.json");
const requestsFile = path.join(__dirname, "..", "data", "requests.json");
const usersFile = path.join(__dirname, "..", "utils", "skilllink.json");

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

describe("DELETE /api/posts/:id (Delete Post)", () => {
  let myUser;
  let myToken;
  let otherUser;
  let otherToken;

  beforeAll(() => {
    const backup = (file) => {
      const b = file + ".bak_test";
      if (fs.existsSync(file)) fs.copyFileSync(file, b);
    };
    [offersFile, requestsFile, usersFile].forEach(backup);
  });

  afterAll(() => {
    const restore = (file) => {
      const b = file + ".bak_test";
      if (fs.existsSync(b)) fs.copyFileSync(b, file);
      if (fs.existsSync(b)) fs.unlinkSync(b);
    };
    [offersFile, requestsFile, usersFile].forEach(restore);
  });

  beforeEach(() => {
    myUser = { id: "u1", username: "pavian", passwordHash: "x" };
    otherUser = { id: "u2", username: "alex", passwordHash: "x" };
    writeJson(usersFile, [myUser, otherUser]);

    myToken = makeToken({ id: myUser.id, username: myUser.username });
    otherToken = makeToken({ id: otherUser.id, username: otherUser.username });

    writeJson(offersFile, [
      {
        id: 11,
        userId: myUser.id,
        username: myUser.username,
        skill: "OldSkill",
        category: "OldCat",
        description: "Old description text",
      },
      {
        id: 22,
        userId: null, // to test missing ownerId
        username: "someone",
        skill: "X",
        category: "Y",
        description: "Long enough description",
      },
    ]);

    writeJson(requestsFile, [
      {
        id: 33,
        userId: otherUser.id,
        username: otherUser.username,
        skill: "ReqSkill",
        category: "ReqCat",
        description: "Req description long enough",
      },
    ]);
  });

  test("200 success when owner deletes an offer", async () => {
    const res = await request(app)
      .delete("/api/posts/11")
      .set("Authorization", `Bearer ${myToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const offersNow = readJson(offersFile);
    expect(offersNow.find((p) => p.id === 11)).toBeUndefined();
  });

  test("200 success when owner deletes a request (in requests.json)", async () => {
    const res = await request(app)
      .delete("/api/posts/33")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const requestsNow = readJson(requestsFile);
    expect(requestsNow.find((p) => p.id === 33)).toBeUndefined();
  });

  test("401 when token missing", async () => {
    const res = await request(app).delete("/api/posts/11");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("403 when not owner", async () => {
    const res = await request(app)
      .delete("/api/posts/11")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not allowed/i);
  });

  test("403 when owner id is missing", async () => {
    const res = await request(app)
      .delete("/api/posts/22")
      .set("Authorization", `Bearer ${myToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/missing owner id/i);
  });

  test("404 when post not found", async () => {
    const res = await request(app)
      .delete("/api/posts/999999")
      .set("Authorization", `Bearer ${myToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("500 when server fails while saving (writeFileSync throws)", async () => {
    const original = fs.writeFileSync;
    fs.writeFileSync = () => {
      throw new Error("disk full");
    };

    const res = await request(app)
      .delete("/api/posts/11")
      .set("Authorization", `Bearer ${myToken}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);

    fs.writeFileSync = original;
  });
});
