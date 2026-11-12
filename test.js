// Quick tests: run with "npm test" while the server is running (npm start)
const BASE = process.env.BASE || "http://localhost:3000";
const cases = [
  ["validate", '{"a":1}', 200], ["validate", '{"a":1,}', 422], ["validate", "{'a':1}", 422],
  ["format", '{"b":[1,2]}', 200], ["minify", '{ "a" : 1 }', 200], ["sort", '{"b":1,"a":2}', 200],
  ["fix", "{a:'x', b:True,}", 200], ["nope", "{}", 404]
];
(async () => {
  const h = await (await fetch(BASE + "/api/health")).json();
  console.log("health:", h.ok ? "OK" : "FAIL");
  let pass = 0;
  for (const [action, json, want] of cases) {
    const r = await fetch(`${BASE}/api/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ json }) });
    const body = await r.json();
    const ok = r.status === want; if (ok) pass++;
    console.log(`${ok ? "PASS" : "FAIL"} ${action.padEnd(9)} ${r.status}  ${body.error && body.error.message ? body.error.message : (body.output || body.error || "").toString().replace(/\n/g, " ").slice(0, 50)}`);
  }
  console.log(`${pass}/${cases.length} passed`);
  process.exit(pass === cases.length ? 0 : 1);
})();
