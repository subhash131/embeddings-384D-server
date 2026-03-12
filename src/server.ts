import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { loadModel } from "./model";
import healthRouter from "./routes/health";
import embedRouter from "./routes/embed";
import storeRouter from "./routes/store";
import matchRouter from "./routes/match";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/** Global limiter – applies to every route */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 req / min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  handler: (req, res, _next, options) => {
    console.warn(
      `[rate-limit] global – blocked ${req.ip} on ${req.method} ${req.url}`,
    );
    res.status(options.statusCode).json(options.message);
  },
});

/** Stricter limiter for compute-heavy endpoints */
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 req / min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Rate limit exceeded for this endpoint. Please slow down.",
  },
  handler: (req, res, _next, options) => {
    console.warn(
      `[rate-limit] heavy – blocked ${req.ip} on ${req.method} ${req.url}`,
    );
    res.status(options.statusCode).json(options.message);
  },
});

/** Write limiter for store mutations */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 writes / min per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Write rate limit exceeded. Please slow down." },
  handler: (req, res, _next, options) => {
    console.warn(
      `[rate-limit] write – blocked ${req.ip} on ${req.method} ${req.url}`,
    );
    res.status(options.statusCode).json(options.message);
  },
});

app.use(globalLimiter);

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;

  console.log(`[req]  --> ${method} ${url}  (ip: ${ip})`);

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    if (status >= 500) {
      console.error(`[res]  ✗  ${method} ${url}  ${status}  ${ms}ms`);
    } else if (status >= 400) {
      console.warn(`[res]  ⚠  ${method} ${url}  ${status}  ${ms}ms`);
    } else {
      console.log(`[res]  <-- ${method} ${url}  ${status}  ${ms}ms`);
    }
  });

  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
console.debug("[server] Registering routes...");
app.use("/", healthRouter);
app.use("/health", healthRouter);
app.use("/embed", heavyLimiter, embedRouter); // CPU/GPU intensive
app.use("/store", writeLimiter, storeRouter); // write operations
app.use("/match", heavyLimiter, matchRouter); // vector search intensive
console.debug("[server] Routes registered: /health, /embed, /store, /match");

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  console.warn(`[server] 404 – unknown route: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Not found.",
    routes: [
      "GET /health",
      "POST /embed",
      "POST /store",
      "GET /store",
      "POST /match",
    ],
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err.message);
  console.error("[server] Stack:", err.stack);
  res
    .status(500)
    .json({ error: "Internal server error.", details: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "8000", 10);
const NODE_ENV = process.env.NODE_ENV ?? "development";

console.debug(`[server] NODE_ENV=${NODE_ENV}, PORT=${PORT}`);
console.log("[server] Loading model...");

loadModel()
  .then(() => {
    console.debug("[server] Model loaded successfully.");
    app.listen(PORT, () => {
      const host = process.env.HOST ?? "localhost";
      const baseUrl = `http://${host}:${PORT}`;

      console.log(`[server] ✓ Listening on port ${PORT}`);
      console.log(`[server] Base URL: ${baseUrl}`);

      console.log(`[server] Routes:`);
      console.log(`   GET    ${baseUrl}/health`);
      console.log(`   POST   ${baseUrl}/embed`);
      console.log(`   POST   ${baseUrl}/store`);
      console.log(`   GET    ${baseUrl}/store`);
      console.log(`   POST   ${baseUrl}/match`);

      console.debug(`[server] Environment: ${NODE_ENV}`);
    });
  })
  .catch((err: Error) => {
    console.error("[model] Failed to load:", err.message);
    console.error("[model] Stack:", err.stack);
    process.exit(1);
  });

export default app;
