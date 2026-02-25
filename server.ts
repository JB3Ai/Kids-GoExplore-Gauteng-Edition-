import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ profiles: {}, images: {} }, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Helper to read DB
  const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  // Helper to write DB
  const writeDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

  // API Routes
  
  // Get user profile (favorites, ratings, etc.)
  app.get("/api/profile/:userId", (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    res.json(db.profiles[userId] || { favorites: [], ratings: {} });
  });

  // Save user profile
  app.post("/api/profile/:userId", (req, res) => {
    const { userId } = req.params;
    const profileData = req.body;
    const db = readDB();
    db.profiles[userId] = profileData;
    writeDB(db);
    res.json({ success: true });
  });

  // Get cached images
  app.get("/api/images", (req, res) => {
    const db = readDB();
    res.json(db.images);
  });

  // Save generated image
  app.post("/api/images", (req, res) => {
    const { ref, url } = req.body;
    const db = readDB();
    db.images[ref] = url;
    writeDB(db);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
