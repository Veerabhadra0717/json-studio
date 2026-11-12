# JSON Studio – frontend + Express backend

## Run on your computer
    npm start
Open http://localhost:3000   (node_modules is included)

The badge at the top says "Server connected" when the backend is working.
If the server is off, the page switches to "Browser mode" and keeps working.

## Test the API
In a second terminal, while the server is running:
    npm test

Or with curl:
    curl http://localhost:3000/api/health
    curl -X POST http://localhost:3000/api/validate -H "Content-Type: application/json" -d "{\"json\": \"{\\\"a\\\":1,}\"}"

## API
GET  /api/health            is the server running?
POST /api/validate          check JSON
POST /api/format            pretty print   (indent: 2, 4 or "tab")
POST /api/minify            remove spaces
POST /api/sort              sort keys A–Z
POST /api/fix               repair common mistakes
Body: {"json": "<your JSON as text>", "indent": 2}
Reply: 200 if the JSON is valid, 422 if it has an error (with line, column and a fix)

## SEO and GEO
public/index.html                          homepage: title, description, share image, app + FAQ structured data, summary sentence
public/guides/common-json-errors/          guide page (keyword: common JSON errors)
public/guides/format-vs-minify-json/       guide page (keyword: format vs minify JSON)
public/api-docs/                           API docs page (keyword: JSON validator API)
public/sitemap.xml, robots.txt, llms.txt   for Google and AI tools
After deploying: add the site to Google Search Console and submit sitemap.xml.

## Project structure
server.js            Express backend (API + website)
lib/json-check.js    the checker, shared by backend and browser
public/index.html    the frontend
test.js              API tests

## Put it online (Vercel)
1. New GitHub repo "json-studio" -> from the MAIN page upload everything except node_modules
2. Vercel -> Add New -> Project -> import it -> Deploy (Vercel detects Express automatically)
3. Vercel -> Settings -> Domains -> add veerabhadra-json.vercel.app
4. Open https://veerabhadra-json.vercel.app/api/health to check the backend
