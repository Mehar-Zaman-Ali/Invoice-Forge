import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { SINGLE_USER_MODE } from "@shared/app-mode";

const app = express();

// -----------------------------------------------------------------------------
// Multi-user / admin (not used while SINGLE_USER_MODE is true)
// Uncomment and finish when you need accounts, roles, or /admin APIs.
// -----------------------------------------------------------------------------
// import session from "express-session";
// import connectPgSimple from "connect-pg-simple";
// import passport from "passport";
// import { Strategy as LocalStrategy } from "passport-local";
//
// const PgSession = connectPgSimple(session);
// app.use(
//   session({
//     store: new PgSession({ conString: process.env.DATABASE_URL, createTableIfMissing: true }),
//     secret: process.env.SESSION_SECRET!,
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 },
//   }),
// );
// app.use(passport.initialize());
// app.use(passport.session());
// passport.use(new LocalStrategy(async (username, password, done) => { ... }));
// app.post("/api/login", passport.authenticate("local"), (req, res) => { ... });
// app.post("/api/logout", (req, res, next) => { req.logout((e) => next(e)); ... });
// app.get("/api/admin/...", requireAdmin, ...);
// -----------------------------------------------------------------------------

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  if (SINGLE_USER_MODE) {
    log("single-user mode: no login, roles, or /admin routes");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Check if running on Windows and adjust server options accordingly
  const isWindows = process.platform === "win32";
  const listenOptions = isWindows
    ? { port, host: "127.0.0.1" }
    : { port, host: "0.0.0.0", reusePort: true };

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
