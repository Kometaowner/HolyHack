const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const DB_FILE = "./keys.json";

// ================= DB =================
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, "[]");
        return [];
    }

    try {
        return JSON.parse(fs.readFileSync(DB_FILE));
    } catch {
        return [];
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function now() {
    return Date.now();
}

// ================= KEY GEN =================
function genKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "XWID-";

    for (let i = 0; i < 5; i++)
        key += chars[Math.floor(Math.random() * chars.length)];

    key += "-";

    for (let i = 0; i < 5; i++)
        key += chars[Math.floor(Math.random() * chars.length)];

    return key;
}

// ================= CHECK =================
app.post("/check", (req, res) => {
    const { key, hwid } = req.body;

    let db = loadDB();
    let k = db.find(x => x.key === key);

    if (!k)
        return res.json({ status: "invalid" });

    if (k.banned)
        return res.json({ status: "banned" });

    if (k.expires !== 4102444800000 && now() > k.expires)
        return res.json({ status: "expired" });

    if (!k.hwid) {
        k.hwid = hwid;
        saveDB(db);
    }

    if (k.hwid !== hwid)
        return res.json({ status: "hwid_mismatch" });

    return res.json({
        status: "ok",
        expires: k.expires
    });
});

// ================= CREATE KEY =================
app.post("/create", (req, res) => {
    const { type } = req.body;

    let db = loadDB();

    let expires;

    if (type === "7d")
        expires = now() + 7 * 86400000;
    else if (type === "30d")
        expires = now() + 30 * 86400000;
    else if (type === "lifetime")
        expires = 4102444800000;
    else
        return res.json({ status: "error" });

    let key = genKey();

    db.push({
        key,
        hwid: null,
        expires,
        banned: false
    });

    saveDB(db);

    res.json({ status: "created", key });
});

// ================= RESET HWID =================
app.post("/reset-hwid", (req, res) => {
    const { key } = req.body;

    let db = loadDB();
    let k = db.find(x => x.key === key);

    if (!k)
        return res.json({ status: "not_found" });

    k.hwid = null;

    saveDB(db);

    res.json({ status: "hwid_reset" });
});

// ================= ADMIN =================
app.get("/admin", (req, res) => {
    res.sendFile(__dirname + "/public/admin.html");
});

app.get("/keys", (req, res) => {
    res.json(loadDB());
});

app.post("/delete", (req, res) => {
    const { key } = req.body;

    let db = loadDB();
    db = db.filter(x => x.key !== key);

    saveDB(db);

    res.json({ status: "deleted" });
});

app.post("/ban", (req, res) => {
    const { key } = req.body;

    let db = loadDB();
    let k = db.find(x => x.key === key);

    if (k) k.banned = true;

    saveDB(db);

    res.json({ status: "banned" });
});

// ================= START =================
app.listen(3000, () => {
    console.log("XWID SERVER RUNNING http://localhost:3000");
});