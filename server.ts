import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";

// Load env vars
dotenv.config();

// Initialize AI — using Vertex AI endpoint as per Google Agentic API demo
function getAIClient() {
  const apiKey = process.env.GOOGLE_CLOUD_AGENTIC_API_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

  if (project) {
    return new GoogleGenAI({ vertexai: true, project, location });
  }
  // Fallback: use API key directly (requires generativelanguage.googleapis.com enabled)
  return new GoogleGenAI({ apiKey: apiKey || "" });
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "maps.googleapis.com", "maps.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "maps.googleapis.com", "maps.gstatic.com", "*.google.com", "*.googleapis.com", "i.ytimg.com", "img.youtube.com"],
        connectSrc: ["'self'", "maps.googleapis.com", "www.googleapis.com"],
        frameSrc: ["'none'"],
      },
    },
  }));
  app.use(compression());
  app.use(express.json({ limit: "50kb" }));
  app.use("/api/", apiLimiter);

  // API Routes
  app.get("/api/config", (req, res) => {
    // Check process.env first
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    res.json({ apiKey: apiKey || null });
  });

  app.get("/api/youtube", async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: { message: "Query is required" } });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: { message: "YouTube API key not configured. Add YOUTUBE_API_KEY to your .env file and enable YouTube Data API v3 in Google Cloud Console." },
      });
    }

    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("q", `${q} travel vlog`);
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", "6");
      url.searchParams.set("relevanceLanguage", "en");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("YouTube API Error:", error);
      res.status(500).json({ error: { message: "Failed to fetch YouTube videos" } });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message, history } = req.body;
    
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }
    const sanitizedMessage = message.slice(0, 10000);

    try {
      // Format history for generateContent
      // history is usually [{role: 'user', parts: [{text: '...'}]}, ...]
      const contents = history ? [...history, { role: 'user', parts: [{ text: sanitizedMessage }] }] : [{ role: 'user', parts: [{ text: sanitizedMessage }] }];

      const client = getAIClient();
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      const message = error?.message || "Failed to get AI response";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/config", (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API Key is required" });
    }

    // 1. Update process.env for current session
    process.env.GOOGLE_MAPS_API_KEY = apiKey;

    // 2. Write to .env file for persistence
    const envPath = path.resolve(process.cwd(), ".env");
    
    try {
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      // Check if key exists
      const keyRegex = /^GOOGLE_MAPS_API_KEY=.*$/m;
      if (keyRegex.test(envContent)) {
        // Replace
        envContent = envContent.replace(keyRegex, `GOOGLE_MAPS_API_KEY="${apiKey}"`);
      } else {
        // Append
        envContent += `\nGOOGLE_MAPS_API_KEY="${apiKey}"\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log("Updated .env file with new API key");
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to write to .env file:", error);
      res.status(500).json({ error: "Failed to save API key" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Handle SPA routing: serve index.html for all non-API routes
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
