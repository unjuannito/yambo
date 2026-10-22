#!/usr/bin/env node
'use strict';

/**
 * check-api-mapping.js
 *
 * Static analysis tool that cross-references frontend service API calls
 * against backend Spring Boot controller mappings to detect broken contracts.
 *
 * Usage:
 *   node scripts/check-api-mapping.js [--output-dir=api-check]
 *
 * Outputs:
 *   {outputDir}/api-mapping-report.html  — Human-readable visual report
 *   {outputDir}/api-mapping-issues.json  — SonarQube Generic Issue Import format
 *
 * Exit codes:
 *   0 — All frontend calls have matching backend endpoints
 *   1 — One or more frontend calls have no matching backend endpoint
 */

const fs = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const BACKEND_SRC = path.join(ROOT, 'backend', 'src', 'main', 'java');
const FRONTEND_SERVICES = path.join(ROOT, 'frontend', 'app', 'services');

// Files that don't make HTTP calls (infrastructure layer or WebSocket)
const EXCLUDE_SERVICES = new Set(['apiService.ts', 'webSocketService.ts']);

// ─── ANSI colors ──────────────────────────────────────────────────────────────

const c = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
};

// ─── Generic Helpers ──────────────────────────────────────────────────────────

/** Recursively find files with a given extension under a directory. */
function findFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

/** Return the 1-based line number at a given character offset in content. */
function lineAt(content, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

/** Advance pos past any whitespace (spaces, tabs, newlines). */
function skipWhitespace(content, pos) {
  while (pos < content.length && /\s/.test(content[pos])) pos++;
  return pos;
}

/**
 * Advance pos past a TypeScript type parameter list `<...>`.
 * Handles nested angle brackets (e.g., `<PagedResponse<User>>`).
 * Returns pos unchanged if the character at pos is not `<`.
 */
function skipTypeParams(content, pos) {
  if (content[pos] !== '<') return pos;
  let depth = 1;
  pos++;
  while (pos < content.length && depth > 0) {
    if (content[pos] === '<') depth++;
    else if (content[pos] === '>') depth--;
    pos++;
  }
  return pos;
}

/**
 * Extract the first string argument starting at pos (which should point at
 * the opening quote character: `"`, `'`, or `` ` ``).
 *
 * For template literals, `${...}` expressions are replaced with the literal
 * token `{param}`, and brace depth is tracked so nested expressions do not
 * prematurely close the outer `${...}`.
 *
 * Returns `{ value: string }` or `null` if no string literal is found.
 */
function extractFirstStringArg(content, pos) {
  pos = skipWhitespace(content, pos);
  const quote = content[pos];
  if (quote !== '"' && quote !== "'" && quote !== '`') return null;

  pos++;
  let value = '';

  if (quote === '`') {
    // Template literal: handle ${...} expression blocks
    let exprDepth = 0;
    while (pos < content.length) {
      const ch = content[pos];
      if (exprDepth === 0) {
        if (ch === '`') break; // end of template literal
        if (ch === '$' && content[pos + 1] === '{') {
          value += '{param}';
          pos += 2;
          exprDepth = 1;
          continue;
        }
        if (ch === '\\') { pos++; value += content[pos] || ''; pos++; continue; }
        value += ch;
      } else {
        // Inside ${...} — track brace depth; ignore nested backtick templates
        if (ch === '{') exprDepth++;
        else if (ch === '}') {
          exprDepth--;
          if (exprDepth === 0) { pos++; continue; }
        }
      }
      pos++;
    }
  } else {
    // Plain string literal
    while (pos < content.length) {
      const ch = content[pos];
      if (ch === quote) break;
      if (ch === '\\') { pos++; value += content[pos] || ''; pos++; continue; }
      value += ch;
      pos++;
    }
  }

  return { value };
}

// ─── Path Normalisation ───────────────────────────────────────────────────────

/**
 * Normalise an API path for comparison:
 *  - `{id}`, `{orderId}`, etc.  → `{param}`   (Spring path variables)
 *  - `:id`, `:name`, etc.       → `{param}`   (Express-style, just in case)
 *  - Strip trailing slash
 *  - Strip the query string portion (everything from `?` onwards)
 *
 * Note: template-literal `${...}` expressions are already replaced with
 * `{param}` by `extractFirstStringArg` before we get here.
 */
function normalizePath(raw) {
  // Strip query string (the ${...} → {param} step may have left literal `?` in the string)
  let p = raw.split('?')[0];
  // Spring-style path variables
  p = p.replace(/\{[^}]+\}/g, '{param}');
  // Express-style :param
  p = p.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{param}');
  // Collapse any double slashes introduced by concatenation
  p = p.replace(/\/\/+/g, '/');
  // Strip trailing slash
  p = p.replace(/\/$/, '');
  return p;
}

// ─── Backend Parser ───────────────────────────────────────────────────────────

/** HTTP method name from a Spring annotation prefix (Get → GET, etc.) */
const SPRING_METHOD = {
  Get: 'GET', Post: 'POST', Put: 'PUT', Patch: 'PATCH', Delete: 'DELETE',
};

/**
 * Extract the first string literal from inside a Spring annotation argument
 * string like `"/path"`, `value = "/path"`, `{"/path"}`, or empty.
 */
function extractAnnotationPath(args) {
  if (!args || !args.trim()) return '';
  const m = /["']([^"']*)["']/.exec(args);
  return m ? m[1] : '';
}

/**
 * Parse all Spring REST controller files and return an array of endpoint descriptors.
 * Each descriptor: { method, path, normalizedPath, file, line }
 */
function parseBackendEndpoints() {
  const endpoints = [];
  const files = findFiles(BACKEND_SRC, '.java');

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relFile = path.relative(ROOT, file).replace(/\\/g, '/');

    // ── Class-level base path ────────────────────────────────────────────────
    // Matches: @RequestMapping("/auth") or @RequestMapping(value = "/auth")
    let classBase = '';
    const classMappingRe = /@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']*)["']/;
    const classMatch = classMappingRe.exec(content);
    if (classMatch) classBase = classMatch[1];

    // ── Method-level annotations ─────────────────────────────────────────────
    // Matches: @GetMapping, @PostMapping, @PutMapping, @PatchMapping, @DeleteMapping
    // With optional argument list: ("path"), (value = "path"), ({"path"}), or none
    const methodAnnotationRe = /@(Get|Post|Put|Patch|Delete)Mapping\s*(?:\(([^)]*)\))?/g;
    let m;
    while ((m = methodAnnotationRe.exec(content)) !== null) {
      const httpMethod = SPRING_METHOD[m[1]];
      const annotationArgs = m[2]; // may be undefined (no parentheses)
      const methodPath = extractAnnotationPath(annotationArgs);
      const fullPath = (classBase + methodPath).replace(/\/\/+/g, '/') || '/';
      endpoints.push({
        method: httpMethod,
        path: fullPath,
        normalizedPath: normalizePath(fullPath),
        file: relFile,
        line: lineAt(content, m.index),
      });
    }

    // ── @RequestMapping on methods (less common, but handles method= attribute) ─
    // e.g., @RequestMapping(value = "/path", method = RequestMethod.GET)
    const methodReqMappingRe = /@RequestMapping\s*\(([^)]*method\s*=\s*RequestMethod\.([A-Z]+)[^)]*)\)/g;
    while ((m = methodReqMappingRe.exec(content)) !== null) {
      const httpMethod = m[2]; // e.g., GET
      if (!['GET','POST','PUT','PATCH','DELETE'].includes(httpMethod)) continue;
      const methodPath = extractAnnotationPath(m[1]);
      const fullPath = (classBase + methodPath).replace(/\/\/+/g, '/') || '/';
      endpoints.push({
        method: httpMethod,
        path: fullPath,
        normalizedPath: normalizePath(fullPath),
        file: relFile,
        line: lineAt(content, m.index),
      });
    }
  }

  return endpoints;
}

// ─── Frontend Parser ──────────────────────────────────────────────────────────

/**
 * Find all API calls made in a single frontend service file.
 * Returns array of { method, rawPath, normalizedPath, file, line }
 */
function parseServiceFile(content, relFile) {
  const calls = [];
  const isServerFile = relFile.endsWith('.server.ts');

  const addCall = (method, rawPath, offset) => {
    if (!rawPath || !rawPath.startsWith('/')) return;
    const normalized = normalizePath(rawPath);
    if (normalized === '/' || normalized === '') return;
    calls.push({
      method,
      path: normalized,
      rawPath,
      file: relFile,
      line: lineAt(content, offset),
    });
  };

  if (isServerFile) {
    // Pattern: fetchJson('/path') or fetchJson(`/path/${id}`)
    const fetchRe = /\bfetchJson\s*\(/g;
    let m;
    while ((m = fetchRe.exec(content)) !== null) {
      let pos = m.index + m[0].length;
      pos = skipWhitespace(content, pos);
      const result = extractFirstStringArg(content, pos);
      if (result) addCall('GET', result.value, m.index);
    }
    return calls;
  }

  // Build a map of `const varName = '/path...'` declarations for variable path resolution
  const varPathMap = new Map(); // varName → rawPath
  const varDeclRe = /\bconst\s+(\w+)\s*=\s*/g;
  let vd;
  while ((vd = varDeclRe.exec(content)) !== null) {
    const varName = vd[1];
    let pos = vd.index + vd[0].length;
    pos = skipWhitespace(content, pos);
    const ch = content[pos];
    if (ch === '"' || ch === "'" || ch === '`') {
      const result = extractFirstStringArg(content, pos);
      if (result && result.value.startsWith('/')) {
        varPathMap.set(varName, result.value);
      }
    }
  }

  // Pattern 1: inherited method calls — this.get/post/put/delete/patch/getPaged
  // NOTE: getPaged must come before get in the alternation to avoid get matching first
  const inheritedRe = /\bthis\.(getPaged|get|post|put|delete|patch)\s*/g;
  let m;
  while ((m = inheritedRe.exec(content)) !== null) {
    const rawMethod = m[1];
    const method = rawMethod.toLowerCase() === 'getpaged' ? 'GET' : rawMethod.toUpperCase();
    let pos = m.index + m[0].length;
    pos = skipTypeParams(content, pos);
    pos = skipWhitespace(content, pos);
    if (content[pos] !== '(') continue;
    pos++; // skip (
    pos = skipWhitespace(content, pos);
    const result = extractFirstStringArg(content, pos);
    if (result) addCall(method, result.value, m.index);
  }

  // Pattern 2: direct axiosInstance calls — this.axiosInstance.get/post/put/delete/patch
  const axiosRe = /\bthis\.axiosInstance\.(get|post|put|delete|patch)\s*/g;
  while ((m = axiosRe.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    let pos = m.index + m[0].length;
    pos = skipTypeParams(content, pos);
    pos = skipWhitespace(content, pos);
    if (content[pos] !== '(') continue;
    pos++; // skip (
    pos = skipWhitespace(content, pos);

    const ch = content[pos];
    if (ch === '"' || ch === "'" || ch === '`') {
      // String literal path
      const result = extractFirstStringArg(content, pos);
      if (result) addCall(method, result.value, m.index);
    } else {
      // Variable path — resolve from const declaration
      const varMatch = /^\w+/.exec(content.slice(pos));
      if (varMatch) {
        const varName = varMatch[0];
        if (varPathMap.has(varName)) {
          addCall(method, varPathMap.get(varName), m.index);
        }
      }
    }
  }

  return calls;
}

/**
 * Parse all frontend service files and return a flat array of API call descriptors.
 */
function parseFrontendEndpoints() {
  const endpoints = [];
  const files = fs.readdirSync(FRONTEND_SERVICES)
    .filter(f => f.endsWith('.ts') && !EXCLUDE_SERVICES.has(f))
    .map(f => path.join(FRONTEND_SERVICES, f));

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relFile = path.relative(ROOT, file).replace(/\\/g, '/');
    endpoints.push(...parseServiceFile(content, relFile));
  }

  return endpoints;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Check whether a (already-normalized) frontend path matches a backend
 * normalizedPath. In addition to exact matching, if the frontend path ends
 * with `{param}` not preceded by `/` (suggesting a conditional query string
 * like `${suffix ? `?${qs}` : ''}`), the stripped prefix is also tried.
 */
function pathsMatch(fePath, bePath) {
  if (fePath === bePath) return true;
  // Fallback: trailing {param} that is NOT a path segment (e.g., /base{param})
  if (fePath.endsWith('{param}')) {
    const prefix = fePath.slice(0, -7); // remove '{param}'
    // Only apply fallback if the char before {param} is NOT a path separator
    if (prefix.length > 0 && !prefix.endsWith('/')) {
      if (prefix === bePath) return true;
    }
  }
  return false;
}

/**
 * Cross-reference frontend calls against backend endpoints.
 * Returns { matched, unmatchedFrontend, unusedBackend }
 */
function matchEndpoints(frontendList, backendList) {
  const usedBackend = new Set();
  const matched = [];
  const unmatchedFrontend = [];

  for (const fe of frontendList) {
    const backendMatch = backendList.find(
      be => be.method === fe.method && pathsMatch(fe.path, be.normalizedPath),
    );
    if (backendMatch) {
      matched.push({ frontend: fe, backend: backendMatch });
      usedBackend.add(backendMatch);
    } else {
      unmatchedFrontend.push(fe);
    }
  }

  const unusedBackend = backendList.filter(be => !usedBackend.has(be));
  return { matched, unmatchedFrontend, unusedBackend };
}

// ─── HTML Report ──────────────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET: '#0066cc', POST: '#28a745', PUT: '#fd7e14',
  PATCH: '#6f42c1', DELETE: '#dc3545',
};

function methodBadge(method) {
  const color = METHOD_COLORS[method] || '#555';
  return `<span style="color:${color};font-weight:bold">${method}</span>`;
}

function generateHTMLReport({ matched, unmatchedFrontend, unusedBackend }, timestamp) {
  const pass = unmatchedFrontend.length === 0;
  const statusBadge = pass
    ? `<div class="badge ok">✓ PASS — All ${matched.length} frontend calls matched</div>`
    : `<div class="badge fail">✗ FAIL — ${unmatchedFrontend.length} unmatched call(s) of ${matched.length + unmatchedFrontend.length} total</div>`;

  const tr = (cells, cls = '') =>
    `<tr${cls ? ` class="${cls}"` : ''}>${cells.map(v => `<td>${v}</td>`).join('')}</tr>`;

  const none = label =>
    `<tr><td colspan="4" class="empty">${label}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>API Mapping Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f0f2f5; color: #222; padding: 2rem; }
  h1 { font-size: 1.35rem; font-weight: 700; margin-bottom: .2rem; }
  .meta { color: #666; font-size: .82rem; margin-bottom: 1.25rem; }
  .badge { display: inline-block; padding: .4rem 1rem; border-radius: 5px; font-weight: 700; font-size: 1rem; margin-bottom: 1.5rem; }
  .badge.ok   { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
  .badge.fail { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  section { margin-bottom: 2rem; }
  h2 { font-size: 1rem; font-weight: 600; margin-bottom: .5rem; display: flex; align-items: baseline; gap: .4rem; }
  .count { font-weight: 400; color: #666; font-size: .88rem; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px;
          overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  th { background: #343a40; color: #fff; text-align: left; padding: .45rem .75rem; font-size: .8rem; font-weight: 600; }
  td { padding: .38rem .75rem; font-size: .78rem; border-bottom: 1px solid #e9ecef; font-family: 'Cascadia Code', 'Fira Mono', monospace; }
  tr:last-child td { border-bottom: none; }
  tr.error td { background: #fff5f5; }
  tr.info  td { background: #f4f6ff; }
  td.empty { text-align: center; color: #888; font-style: italic; font-family: system-ui; }
</style>
</head>
<body>
<h1>API Mapping Contract Report</h1>
<div class="meta">Generated: ${timestamp}</div>
${statusBadge}

<section>
  <h2>❌ Unmatched Frontend Calls <span class="count">(${unmatchedFrontend.length})</span></h2>
  <table>
    <tr><th>Method</th><th>Normalized Path</th><th>Frontend File</th><th>Line</th></tr>
    ${unmatchedFrontend.length
      ? unmatchedFrontend.map(fe => tr([methodBadge(fe.method), fe.path, fe.file, fe.line], 'error')).join('\n    ')
      : none('No unmatched calls — all frontend calls have a matching backend endpoint ✓')
    }
  </table>
</section>

<section>
  <h2>✅ Matched Calls <span class="count">(${matched.length})</span></h2>
  <table>
    <tr><th>Method</th><th>Path</th><th>Frontend File : Line</th><th>Backend File : Line</th></tr>
    ${matched.length
      ? matched.map(({ frontend: fe, backend: be }) =>
          tr([methodBadge(fe.method), fe.path, `${fe.file}:${fe.line}`, `${be.file}:${be.line}`])
        ).join('\n    ')
      : none('No matched calls')
    }
  </table>
</section>

<section>
  <h2>ℹ️ Backend Endpoints Without Frontend Callers <span class="count">(${unusedBackend.length})</span></h2>
  <table>
    <tr><th>Method</th><th>Path</th><th>Backend File</th><th>Line</th></tr>
    ${unusedBackend.length
      ? unusedBackend.map(be => tr([methodBadge(be.method), be.path, be.file, be.line], 'info')).join('\n    ')
      : none('All backend endpoints have at least one frontend caller')
    }
  </table>
</section>
</body>
</html>`;
}

// ─── SonarQube Generic Issue Import ──────────────────────────────────────────

/**
 * Build a SonarQube Generic Issue Import JSON object.
 * See: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/importing-external-issues/generic-issue-import-format/
 */
function generateSonarIssues({ unmatchedFrontend }) {
  return {
    issues: unmatchedFrontend.map(fe => ({
      engineId: 'api-mapping-check',
      ruleId: 'frontend-endpoint-not-found',
      severity: 'MAJOR',
      type: 'BUG',
      primaryLocation: {
        message: `Frontend calls ${fe.method} ${fe.path} but no matching backend endpoint was found`,
        filePath: fe.file,
        textRange: {
          startLine: fe.line,
          endLine: fe.line,
          startColumn: 0,
          endColumn: 0,
        },
      },
    })),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Parse --output-dir=<dir> argument
  let outputDir = 'api-check';
  for (const arg of process.argv.slice(2)) {
    const m = /^--output-dir=(.+)$/.exec(arg);
    if (m) outputDir = m[1];
  }
  const outputPath = path.resolve(process.cwd(), outputDir);

  console.log(c.bold('\n🔍 API Mapping Contract Check'));
  console.log(`   Backend : ${path.relative(process.cwd(), BACKEND_SRC)}`);
  console.log(`   Frontend: ${path.relative(process.cwd(), FRONTEND_SERVICES)}`);
  console.log(`   Output  : ${path.relative(process.cwd(), outputPath)}\n`);

  // ── Parse ─────────────────────────────────────────────────────────────────
  const backendEndpoints  = parseBackendEndpoints();
  const frontendEndpoints = parseFrontendEndpoints();

  console.log(`   Backend endpoints found : ${backendEndpoints.length}`);
  console.log(`   Frontend calls found    : ${frontendEndpoints.length}\n`);

  // ── Match ─────────────────────────────────────────────────────────────────
  const results = matchEndpoints(frontendEndpoints, backendEndpoints);

  // ── Console summary ───────────────────────────────────────────────────────
  if (results.unmatchedFrontend.length > 0) {
    console.log(c.red(c.bold(`✗ ${results.unmatchedFrontend.length} unmatched frontend call(s):\n`)));
    for (const fe of results.unmatchedFrontend) {
      console.log(c.red(`   ${fe.method.padEnd(7)} ${fe.path}`));
      console.log(c.red(`           → ${fe.file}:${fe.line}\n`));
    }
  }

  console.log(`   Matched      : ${c.green(String(results.matched.length))}`);
  console.log(`   Unmatched    : ${results.unmatchedFrontend.length > 0 ? c.red(String(results.unmatchedFrontend.length)) : '0'}`);
  console.log(`   Unused (BE)  : ${results.unusedBackend.length}\n`);

  // ── Write reports ─────────────────────────────────────────────────────────
  fs.mkdirSync(outputPath, { recursive: true });

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const htmlPath  = path.join(outputPath, 'api-mapping-report.html');
  const jsonPath  = path.join(outputPath, 'api-mapping-issues.json');

  fs.writeFileSync(htmlPath, generateHTMLReport(results, timestamp));
  fs.writeFileSync(jsonPath, JSON.stringify(generateSonarIssues(results), null, 2));

  const rel = p => path.relative(process.cwd(), p);
  console.log(`   Reports written:`);
  console.log(`     ${rel(htmlPath)}`);
  console.log(`     ${rel(jsonPath)}\n`);

  // ── Exit ──────────────────────────────────────────────────────────────────
  if (results.unmatchedFrontend.length > 0) {
    console.log(c.red('✗ Build FAILED: one or more frontend API calls have no matching backend endpoint.\n'));
    process.exit(1);
  }

  console.log(c.green('✓ All frontend API calls have matching backend endpoints.\n'));
}

main();
