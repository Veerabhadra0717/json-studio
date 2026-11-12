// JSON Studio – Express backend
// Serves the website and a small JSON API.
const express = require("express");
const compression = require("compression");
const path = require("path");
const JsonCheck = require("./lib/json-check");

const app = express();
const PORT = process.env.PORT || 3000;
const ACTIONS = ["validate", "format", "minify", "sort", "fix"];

app.disable("x-powered-by");
app.use(compression());

// Accept JSON bodies like {"json": "..."} and also raw text bodies (useful with curl)
app.use("/api", express.json({ limit: "2mb" }));
app.use("/api", express.text({ type: ["text/*", "application/octet-stream"], limit: "2mb" }));

// Allow other websites or apps to call the API
app.use("/api", (req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health check: open /api/health to see if the backend is running
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "json-studio", actions: ACTIONS, time: new Date().toISOString() });
});

// POST /api/validate, /api/format, /api/minify, /api/sort, /api/fix
app.post("/api/:action", (req, res) => {
  const action = req.params.action;
  if (!ACTIONS.includes(action)) {
    return res.status(404).json({ error: `Unknown action "${action}". Use one of: ${ACTIONS.join(", ")}.` });
  }

  // The JSON to check comes as text: either {"json": "..."} or a raw text body
  let text, indent = 2;
  if (typeof req.body === "string") {
    text = req.body;
    indent = req.query.indent || 2;
  } else if (req.body && typeof req.body.json === "string") {
    text = req.body.json;
    indent = req.body.indent || 2;
  } else {
    return res.status(400).json({ error: 'Send the JSON as text, for example {"json": "{\\"a\\":1}"}' });
  }

  const started = process.hrtime.bigint();
  const result = JsonCheck.run(action, text, { indent });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;

  res.set("X-Processing-Time", ms.toFixed(2) + "ms");
  // 200 = valid JSON, 422 = the JSON has an error (the request itself was fine)
  res.status(result.valid ? 200 : 422).json({ ...result, processedBy: "server", ms: Number(ms.toFixed(2)) });
});

// The shared checker, so the browser can use the same code when offline
app.get("/js/json-check.js", (req, res) => {
  res.type("application/javascript").sendFile(path.join(__dirname, "lib", "json-check.js"));
});

// Broken or too-large request bodies: reply with clean JSON, never a stack trace
app.use("/api", (err, req, res, next) => {
  const tooBig = err.type === "entity.too.large";
  res.status(tooBig ? 413 : 400).json({
    error: tooBig ? "Request is too large (limit 2 MB)." : 'The request body isn\'t valid JSON. Send {"json": "<your JSON as text>"}, or send the JSON as text/plain.'
  });
});

// Website files
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h", extensions: ["html"] }));

// Unknown pages get a real 404 status, so Google doesn't index them (SEO)
app.use((req, res) => {
  res.status(404).type("html").send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Page not found – JSON Studio</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#EDF1F7;color:#14213D;text-align:center;padding:1.5rem}
h1{font-family:ui-monospace,Menlo,monospace;font-weight:500}a{color:#2F5BEA}</style></head>
<body><div><h1>{ "page": null }</h1><p>This page doesn’t exist. <a href="/">Open JSON Studio</a></p></div></body></html>`);
});

// Run locally with "npm start". On Vercel, the exported app is used instead.
if (require.main === module) {
  app.listen(PORT, () => console.log(`JSON Studio running at http://localhost:${PORT}`));
}
module.exports = app;
