#!/usr/bin/env node
// Fails if this app can reach anything but the Cloudflare backend.
//
// Owner decisions (2026-11-01): "The mobile app should only be connecting to
// the cloudflare backend never vercel", and "We should be connecting the app
// to the api not directly to the mongodb because things will get messy. And
// the api connected to all our data platforms". So the app speaks HTTP to the
// weather API and nothing else: no retired web host, no database client, no
// database URL, no weather provider called directly.
//
// It reads every text file in the project (source, config, .env.example, the
// README, workflows) and fails on:
//
//   1. a forbidden pattern: the retired web host, Vercel, the retired
//      /api/py routes, a database URL or name, a weather provider host;
//   2. a URL on a Mukoko-owned host that is not on the allow-lists below;
//   3. a database client package in package.json or package-lock.json.
//
// Run by `npm test` (src/__tests__/cloudflare-only.test.ts) and as
// `npm run check:cloudflare-only`. Exits 1 with the findings. Takes an
// optional directory to check instead of the repo root (used by its tests).
//
// This file and its test name the forbidden things on purpose, so they are
// the only two files it does not read.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("..", import.meta.url));

// Hosts the app may call: the Cloudflare backend. api.mukoko.com is the Mukoko
// consumer API, which fronts the same Workers (it has no DNS yet).
const API_HOSTS = new Set(["weather-api.mukoko.com", "api.mukoko.com"]);

// Mukoko-owned hosts that are not data backends. The app opens this one in the
// system browser to sign a person in (WorkOS AuthKit); it is never called with
// weather or device data.
const IDENTITY_HOSTS = new Set(["auth.mukoko.com"]);

// [pattern, what it is]. Matched case-insensitively against each line.
const FORBIDDEN = [
  [/weather\.mukoko\.com/i, "the retired web host weather.mukoko.com"],
  [/vercel/i, "Vercel"],
  [/\/api\/py\b/i, "the retired /api/py routes"],
  [/mongodb(\+srv)?:\/\//i, "a MongoDB connection string"],
  [/postgres(ql)?:\/\//i, "a Postgres connection string"],
  [/mysql:\/\//i, "a MySQL connection string"],
  [/rediss?:\/\//i, "a Redis connection string"],
  [/couchdb|pouchdb|couchbase/i, "a CouchDB or Couchbase reference"],
  [/open-meteo\.com/i, "a direct call to Open-Meteo (only the Worker does)"],
  [/api\.tomorrow\.io/i, "a direct call to Tomorrow.io (only the Worker does)"],
];

// Database drivers, ORMs and query builders: never a dependency of the app.
const FORBIDDEN_PACKAGES = new Set([
  "mongodb",
  "mongoose",
  "pg",
  "postgres",
  "pg-promise",
  "@neondatabase/serverless",
  "@supabase/supabase-js",
  "@supabase/postgrest-js",
  "mysql",
  "mysql2",
  "mariadb",
  "@planetscale/database",
  "@libsql/client",
  "@prisma/client",
  "prisma",
  "drizzle-orm",
  "kysely",
  "knex",
  "sequelize",
  "typeorm",
  "redis",
  "ioredis",
  "@upstash/redis",
  "@clickhouse/client",
  "cassandra-driver",
  "couchbase",
  "nano",
  "pouchdb",
  "pouchdb-browser",
  "pouchdb-core",
  "firebase-admin",
  "@aws-sdk/client-dynamodb",
]);
const FORBIDDEN_PREFIXES = ["@vercel/", "@neondatabase/", "@prisma/adapter-"];

// Never read: this guard and its test (they name the forbidden things), and
// everything that is not the project's own text.
const SKIP_FILES = new Set([
  "scripts/check-cloudflare-only.mjs",
  "src/__tests__/cloudflare-only.test.ts",
  "package-lock.json",
]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "web-build",
  "ios",
  "android",
  "coverage",
]);
const TEXT_FILE =
  /(\.(m?[jt]sx?|cjs|json|jsonc|md|mdx|ya?ml|toml|css|html|txt|example)|\/?\.env[^/]*)$/i;
const MAX_BYTES = 1_000_000;

const findings = [];

function isForbiddenPackage(name) {
  return (
    FORBIDDEN_PACKAGES.has(name) ||
    FORBIDDEN_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

// --- 1 and 2. Text ---------------------------------------------------------------

function scanText(file, text) {
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    for (const [pattern, what] of FORBIDDEN) {
      if (pattern.test(line)) findings.push(`${where}: ${what}`);
    }
    for (const m of line.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      const host = m[1].toLowerCase().replace(/\.+$/, "");
      const ours = host === "mukoko.com" || host.endsWith(".mukoko.com");
      if (ours && !API_HOSTS.has(host) && !IDENTITY_HOSTS.has(host)) {
        findings.push(
          `${where}: ${host} is a Mukoko host that is not on the Cloudflare allow-list`,
        );
      }
    }
  });
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const file = relative(root, path).split(sep).join("/");
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(path);
    } else if (
      !SKIP_FILES.has(file) &&
      TEXT_FILE.test(entry) &&
      statSync(path).size <= MAX_BYTES
    ) {
      scanText(file, readFileSync(path, "utf8"));
    }
  }
}
walk(root);

// --- 3. Packages -----------------------------------------------------------------

try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (isForbiddenPackage(name)) {
        findings.push(
          `package.json ${field}: ${name} is a database or Vercel package`,
        );
      }
    }
  }
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

let lock = null;
try {
  lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
} catch {
  // No lockfile to read.
}
for (const path of Object.keys(lock?.packages ?? {})) {
  const marker = "node_modules/";
  const at = path.lastIndexOf(marker);
  if (at === -1) continue;
  const name = path.slice(at + marker.length);
  if (isForbiddenPackage(name)) {
    findings.push(`package-lock.json: ${path} is a database or Vercel package`);
  }
}

// --- Report ------------------------------------------------------------------------

if (findings.length > 0) {
  console.error(
    "The app must reach only the Cloudflare backend (weather-api.mukoko.com,\n" +
      "later api.mukoko.com), and never a database. Found:\n",
  );
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exit(1);
}
console.log(
  "check-cloudflare-only: only Cloudflare hosts, no database clients or URLs.",
);
