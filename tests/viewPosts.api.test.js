const request = require("supertest");
const fs = require("fs");
const path = require("path");
const app = require("../server");

const offersFile = path.join(__dirname, "..", "data", "offers.json");
const requestsFile = path.join(__dirname, "..", "data", "requests.json");
const usersFile = path.join(__dirname, "..", "utils", "skilllink.json");

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

describe("GET /api/posts (View Posts)", () => {
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
    writeJson(usersFile, []);
    writeJson(offersFile, []);
    writeJson(requestsFile, []);
  });

  test("200 returns success with offers and requests arrays", async () => {
    const res = await request(app).get("/api/posts");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.offers)).toBe(true);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  test("normalize fills missing fields and returns safe defaults", async () => {
    writeJson(offersFile, [{ id: 1, name: "John" }]); // name -> username, missing others
    writeJson(requestsFile, [{ id: 2, username: "Lisa", skill: "Piano" }]);

    const res = await request(app).get("/api/posts");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.offers[0].username).toBe("John");
    expect(res.body.offers[0].skill).toBe(""); // default
    expect(res.body.offers[0].category).toBe(""); // default
    expect(res.body.offers[0].description).toBe(""); // default
  });
});
