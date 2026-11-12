/*
 * json-check.js – shared by the backend (Node) and the frontend (browser).
 * Finds the exact position of a JSON error and explains it in plain English.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.JsonCheck = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function check(src) {
    var i = 0, n = src.length;
    function prevComma(p) { var k = p - 1; while (k >= 0 && /\s/.test(src[k])) k--; return src[k] === "," ? k : p; }
    function fail(pos, msg, hint) { var e = new Error(msg); e.pos = pos; e.hint = hint; throw e; }
    function ws() {
      while (i < n) {
        var c = src[i];
        if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
        if ((c === "/" && (src[i + 1] === "/" || src[i + 1] === "*")) || c === "#")
          fail(i, "Comments aren’t allowed in JSON", "Delete the comment. JSON has no comment syntax.");
        break;
      }
    }
    function value() {
      ws();
      if (i >= n) fail(i, "Unexpected end of JSON", "Something isn’t closed. Check that every {, [ and \" has a matching }, ] and \".");
      var c = src[i];
      if (c === "{") return obj();
      if (c === "[") return arr();
      if (c === "\"") return str();
      if (c === "'") fail(i, "Single quotes aren’t allowed", "Use double quotes \" instead of single quotes '.");
      if (c === "-" || (c >= "0" && c <= "9")) return num();
      var w = (src.slice(i).match(/^[A-Za-z_$][\w$]*/) || [""])[0];
      if (w === "true" || w === "false" || w === "null") { i += w.length; return; }
      if (w === "True" || w === "False") fail(i, "Wrong capital letters in " + w, "Write " + w.toLowerCase() + " in lowercase.");
      if (w === "None") fail(i, "None isn’t valid JSON", "Use null instead of None.");
      if (w === "undefined") fail(i, "undefined isn’t valid JSON", "Use null, or remove this item.");
      if (w === "NaN" || w === "Infinity") fail(i, w + " isn’t valid JSON", "Use a normal number, a string, or null.");
      if (c === "}" || c === "]") fail(prevComma(i), "Unexpected " + c, "A value is missing here, or there’s an extra comma.");
      if (c === ",") fail(i, "Unexpected comma", "There’s an extra comma, or a value is missing.");
      if (w) fail(i, "Text without quotes: " + w, "Put text in double quotes, like \"" + w + "\".");
      fail(i, "Unexpected character " + c, "Remove this character or put it inside a string.");
    }
    function obj() {
      i++; ws();
      if (src[i] === "}") { i++; return; }
      for (;;) {
        ws();
        if (i >= n) fail(i, "Unexpected end of JSON", "An object { isn’t closed. Add } at the end.");
        var c = src[i];
        if (c === "}") fail(prevComma(i), "Extra comma before }", "Remove this comma. The last item in an object has no comma after it.");
        if (c === "'") fail(i, "Single quotes aren’t allowed", "Keys need double quotes, like \"name\".");
        if (c !== "\"") {
          var w = (src.slice(i).match(/^[A-Za-z_$][\w$-]*/) || [""])[0];
          if (w) fail(i, "Key without quotes: " + w, "Keys must be in double quotes, like \"" + w + "\".");
          fail(i, "Expected a key in double quotes", "Each item in an object looks like \"key\": value.");
        }
        str(); ws();
        if (src[i] !== ":") fail(i, "Missing colon after key", "Add a : between the key and its value.");
        i++; value(); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "}") { i++; return; }
        if (i >= n) fail(i, "Unexpected end of JSON", "An object { isn’t closed. Add } at the end.");
        fail(i, "Missing comma between items", "Add a comma before this item.");
      }
    }
    function arr() {
      i++; ws();
      if (src[i] === "]") { i++; return; }
      for (;;) {
        ws();
        if (src[i] === "]") fail(prevComma(i), "Extra comma before ]", "Remove this comma. The last item in a list has no comma after it.");
        value(); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "]") { i++; return; }
        if (i >= n) fail(i, "Unexpected end of JSON", "A list [ isn’t closed. Add ] at the end.");
        fail(i, "Missing comma between items", "Add a comma before this item.");
      }
    }
    function str() {
      var start = i; i++;
      while (i < n) {
        var c = src[i];
        if (c === "\"") { i++; return; }
        if (c === "\\") {
          var e = src[i + 1];
          if ("\"\\/bfnrt".indexOf(e) >= 0) { i += 2; continue; }
          if (e === "u" && /^[0-9a-fA-F]{4}$/.test(src.substr(i + 2, 4))) { i += 6; continue; }
          fail(i, "Invalid escape \\" + (e || ""), "Use \\\\ for a backslash. Valid escapes are \\\" \\\\ \\/ \\b \\f \\n \\r \\t \\uXXXX.");
        }
        if (c === "\n") fail(i, "Line break inside a string", "Close the string with \" on the same line, or write \\n for a new line.");
        if (c < " ") fail(i, "Control character inside a string", "Replace tabs with \\t inside strings.");
        i++;
      }
      fail(start, "String isn’t closed", "Add a closing \" to this string.");
    }
    function num() {
      var m = src.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/);
      if (!m) fail(i, "Invalid number", "Numbers look like 12, -3.5 or 1e6.");
      var after = src[i + m[0].length];
      if (m[1] === "0" && after >= "0" && after <= "9") fail(i, "Numbers can’t start with 0", "Remove the leading 0, or put the value in quotes.");
      if (after === "." || (after >= "0" && after <= "9")) fail(i + m[0].length, "Invalid number", "Numbers look like 12, -3.5 or 1e6.");
      i += m[0].length;
    }
    value(); ws();
    if (i < n) fail(i, "Extra content after the JSON", "JSON must be one value. Wrap several items in [ ] and separate them with commas.");
  }

  function lineCol(src, pos) {
    var line = 1, col = 1;
    for (var k = 0; k < pos && k < src.length; k++) { if (src[k] === "\n") { line++; col = 1; } else col++; }
    return { line: line, col: col };
  }

  function stats(v) {
    var keys = 0, depth = 0;
    (function walk(x, d) {
      depth = Math.max(depth, d);
      if (Array.isArray(x)) x.forEach(function (y) { walk(y, d + 1); });
      else if (x && typeof x === "object") Object.keys(x).forEach(function (k) { keys++; walk(x[k], d + 1); });
    })(v, 0);
    var type = Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
    return { type: type, items: Array.isArray(v) ? v.length : null, keys: keys, depth: depth };
  }

  /* analyze: the one function both sides use */
  function analyze(src) {
    if (typeof src !== "string" || !src.trim())
      return { valid: false, empty: true, error: { message: "No JSON provided", hint: "Paste some JSON to check.", pos: 0, line: 1, col: 1 } };
    try {
      check(src);
      var value = JSON.parse(src);
      return { valid: true, value: value, stats: stats(value) };
    } catch (e) {
      var pos = typeof e.pos === "number" ? e.pos : 0, lc = lineCol(src, pos);
      return { valid: false, error: { message: e.message || "Invalid JSON", hint: e.hint || "Check the JSON near this position.", pos: pos, line: lc.line, col: lc.col } };
    }
  }

  function indentOf(x) { return x === "tab" ? "\t" : Math.min(8, Math.max(0, Number(x) || 2)); }
  function sortKeys(x) {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === "object") { var o = {}; Object.keys(x).sort().forEach(function (k) { o[k] = sortKeys(x[k]); }); return o; }
    return x;
  }

  /* fix: repairs common mistakes, never touching text inside "strings" */
  var STR = "(\"(?:\\\\.|[^\"\\\\])*\")";
  function fix(s) {
    s = s.replace(new RegExp(STR + "|\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*", "g"), function (m, str) { return str || ""; });
    s = s.replace(new RegExp(STR + "|'((?:\\\\.|[^'\\\\])*)'", "g"), function (m, dq, sq) { return dq || "\"" + sq.replace(/\\'/g, "'").replace(/"/g, "\\\"") + "\""; });
    s = s.replace(new RegExp(STR + "|([{,]\\s*)([A-Za-z_$][\\w$-]*)(\\s*:)", "g"), function (m, str, a, k, c) { return str || a + "\"" + k + "\"" + c; });
    s = s.replace(new RegExp(STR + "|\\b(True|False|None|undefined)\\b", "g"), function (m, str, w) { return str || { True: "true", False: "false", None: "null", undefined: "null" }[w]; });
    s = s.replace(new RegExp(STR + "|,(\\s*[}\\]])", "g"), function (m, str, end) { return str || end; });
    return s;
  }

  /* run: one entry point for every action */
  function run(action, src, opts) {
    opts = opts || {};
    if (action === "fix") {
      var fixed = fix(String(src || ""));
      var r2 = analyze(fixed);
      return { action: "fix", changed: fixed !== src, output: fixed, valid: r2.valid, error: r2.error || null, stats: r2.stats || null };
    }
    var r = analyze(src);
    if (!r.valid) return { action: action, valid: false, error: r.error, output: null, stats: null };
    var ind = indentOf(opts.indent), out;
    if (action === "minify") out = JSON.stringify(r.value);
    else if (action === "sort") out = JSON.stringify(sortKeys(r.value), null, ind);
    else out = JSON.stringify(r.value, null, ind);
    return { action: action, valid: true, error: null, output: out, stats: r.stats };
  }

  return { check: check, analyze: analyze, run: run, fix: fix, stats: stats, lineCol: lineCol };
});
