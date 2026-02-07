const fs = require("fs");
const path = require("path");
const SkillPostUtil = require("../utils/SkillPostUtil");

const offersFile = path.join(__dirname, "..", "data", "offers.json");
const requestsFile = path.join(__dirname, "..", "data", "requests.json");

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  return raw ? JSON.parse(raw) : null;
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}
function writeRaw(p, rawString) {
  fs.writeFileSync(p, rawString, "utf8");
}

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("SkillPostUtil unreachable branches (unit)", () => {
  test("__log handles missing meta (covers line 18)", () => {
    const { __log } = require("../utils/SkillPostUtil");
    const original = console.log;
    console.log = jest.fn();

    __log("log", "HELLO"); // meta is undefined

    expect(console.log).toHaveBeenCalled();

    console.log = original;
  });

  test("viewPosts returns empty arrays when data files are missing (covers readJson existsSync false)", () => {
    const originalExistsSync = fs.existsSync;

    // Force offers + requests to look missing
    jest.spyOn(fs, "existsSync").mockImplementation((p) => {
      if (p === offersFile || p === requestsFile) return false;
      return originalExistsSync(p);
    });

    const res = makeRes();
    SkillPostUtil.viewPosts({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const offers = res.body.offers ?? res.body.data?.offers ?? [];
    const requests = res.body.requests ?? res.body.data?.requests ?? [];

    expect(Array.isArray(offers)).toBe(true);
    expect(Array.isArray(requests)).toBe(true);

    fs.existsSync.mockRestore();
  });

  test("viewPosts normalizes non-array JSON and writes back (covers normalize non-array branch)", () => {
    // backup current on-disk data
    const offersBackupRaw = fs.existsSync(offersFile) ? fs.readFileSync(offersFile, "utf8") : null;
    const requestsBackupRaw = fs.existsSync(requestsFile) ? fs.readFileSync(requestsFile, "utf8") : null;

    try {
      // Put invalid shape: object instead of array
      writeRaw(offersFile, JSON.stringify({ bad: true }, null, 2));
      writeRaw(requestsFile, JSON.stringify({ bad: true }, null, 2));

      const res = makeRes();
      SkillPostUtil.viewPosts({}, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // After normalization, readJson() should return arrays (often [])
      const offersAfter = readJson(offersFile);
      const requestsAfter = readJson(requestsFile);

      expect(Array.isArray(offersAfter)).toBe(true);
      expect(Array.isArray(requestsAfter)).toBe(true);
    } finally {
      // restore raw backups (or remove if they didn't exist)
      if (offersBackupRaw === null) {
        if (fs.existsSync(offersFile)) fs.unlinkSync(offersFile);
      } else {
        writeRaw(offersFile, offersBackupRaw);
      }

      if (requestsBackupRaw === null) {
        if (fs.existsSync(requestsFile)) fs.unlinkSync(requestsFile);
      } else {
        writeRaw(requestsFile, requestsBackupRaw);
      }
    }
  });

  test("viewPosts writes back ids when missing (covers changed branch)", () => {
    const offersBackup = readJson(offersFile);
    const requestsBackup = readJson(requestsFile);

    try {
      // seed missing ids
      writeJson(offersFile, [
        { userId: "u1", username: "pavian", skill: "A", category: "", description: "" },
      ]);
      writeJson(requestsFile, [
        { userId: "u2", username: "alex", skill: "B", category: "", description: "" },
      ]);

      const req = {};
      const res = makeRes();

      SkillPostUtil.viewPosts(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // confirm ids were added AND persisted
      const offersAfter = readJson(offersFile);
      const requestsAfter = readJson(requestsFile);

      expect(offersAfter[0].id).toBeTruthy();
      expect(requestsAfter[0].id).toBeTruthy();
    } finally {
      // restore originals (handle "missing file" backup = null)
      if (offersBackup === null) {
        if (fs.existsSync(offersFile)) fs.unlinkSync(offersFile);
      } else {
        writeJson(offersFile, offersBackup);
      }

      if (requestsBackup === null) {
        if (fs.existsSync(requestsFile)) fs.unlinkSync(requestsFile);
      } else {
        writeJson(requestsFile, requestsBackup);
      }
    }
  });

  test("updatePost -> 401 when req.user missing (not_logged_in branch)", () => {
    const req = {
      params: { id: "11" },
      body: { skill: "Python", category: "Programming", description: "Long enough description" },
      user: null,
    };
    const res = makeRes();

    SkillPostUtil.updatePost(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("deletePost -> 401 when req.user missing", () => {
    const req = { params: { id: "11" }, user: null };
    const res = makeRes();

    SkillPostUtil.deletePost(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
