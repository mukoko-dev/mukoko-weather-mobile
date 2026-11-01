/**
 * The one-backend guard (scripts/check-cloudflare-only.mjs).
 *
 * Owner decisions, 2026-11-01: the app connects only to the Cloudflare backend
 * and never to a website's server, and it connects to the API, never to a
 * database. The first test runs the guard on this repository, so `npm test`
 * (and the org's test check) fails the moment a source file, config,
 * .env.example or README names a retired host, a database URL or a client
 * package. The rest build throwaway projects and prove the guard catches each
 * kind of violation and lets the allowed hosts through.
 *
 * This file names the forbidden things on purpose, so the guard does not read
 * it.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "check-cloudflare-only.mjs");

function run(dir: string) {
  return spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
}

const made: string[] = [];

/** A throwaway project: clean files overlaid with `files`. */
function project(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "check-cloudflare-only-"));
  made.push(dir);
  const all: Record<string, string> = {
    "package.json": JSON.stringify({ dependencies: { expo: "~58.0.0" } }),
    ".env.example": "EXPO_PUBLIC_API_URL=https://weather-api.mukoko.com\n",
    "README.md": "# App\n\nTalks to https://weather-api.mukoko.com.\n",
    "src/api/client.ts":
      'export const BASE = "https://weather-api.mukoko.com";\n',
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

describe("this repository", () => {
  it("reaches only the Cloudflare backend and no database", () => {
    const result = run(repoRoot);
    // The report lists every finding, so a failure says exactly what to fix.
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/only Cloudflare hosts/);
  });
});

describe("a clean project", () => {
  it("passes", () => {
    expect(run(project()).status).toBe(0);
  });

  it("allows both Cloudflare hosts and the sign-in host", () => {
    const result = run(
      project({
        "src/hosts.ts": [
          'export const A = "https://weather-api.mukoko.com/v1/weather";',
          'export const B = "https://api.mukoko.com/v1/weather";',
          'export const C = "https://auth.mukoko.com/oauth2/authorize";',
        ].join("\n"),
      }),
    );
    expect(result.status).toBe(0);
  });

  it("does not read node_modules or .git", () => {
    const result = run(
      project({
        "node_modules/x/index.js": 'fetch("https://weather.mukoko.com");',
        ".git/config": "url = https://example.vercel.app",
      }),
    );
    expect(result.status).toBe(0);
  });
});

describe("a retired host or platform", () => {
  const cases: [string, Record<string, string>, RegExp][] = [
    [
      "the retired web host in source",
      { "src/api/client.ts": 'const B = "https://weather.mukoko.com";' },
      /src\/api\/client\.ts:1: the retired web host/,
    ],
    [
      "the retired web host as the .env.example default",
      { ".env.example": "EXPO_PUBLIC_API_URL=https://weather.mukoko.com\n" },
      /\.env\.example:1: the retired web host/,
    ],
    [
      "the retired web host in the README",
      { "README.md": "API base: https://weather.mukoko.com\n" },
      /README\.md:1: the retired web host/,
    ],
    [
      "the retired web host with no scheme",
      { "src/x.ts": "// weather.mukoko.com" },
      /src\/x\.ts:1: the retired web host/,
    ],
    [
      "a Vercel deployment",
      { "src/x.ts": 'const B = "https://app-git-main.vercel.app";' },
      /src\/x\.ts:1: Vercel/,
    ],
    [
      "Vercel in app.json",
      { "app.json": '{"expo":{"extra":{"host":"my-vercel-app"}}}' },
      /app\.json:1: Vercel/,
    ],
    [
      "a retired /api/py route",
      { "src/x.ts": 'apiFetch("/api/py/weather");' },
      /src\/x\.ts:1: the retired \/api\/py routes/,
    ],
    [
      "a retired route in the README",
      { "README.md": "Calls `/api/py/chat`.\n" },
      /README\.md:1: the retired \/api\/py routes/,
    ],
  ];
  it.each(cases)("fails on %s", (_name, files, expected) => {
    const result = run(project(files));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(expected);
  });
});

describe("a database", () => {
  const cases: [string, Record<string, string>, RegExp][] = [
    [
      "a MongoDB connection string",
      { "src/x.ts": 'const U = "mongodb://db.internal/weather";' },
      /MongoDB connection string/,
    ],
    [
      "a MongoDB SRV connection string",
      { "src/x.ts": 'const U = "mongodb+srv://c.example.net/weather";' },
      /MongoDB connection string/,
    ],
    [
      "a Postgres connection string",
      { ".env.example": "DATABASE_URL=postgres://u:p@db/x\n" },
      /Postgres connection string/,
    ],
    [
      "a CouchDB reference",
      { "src/x.ts": 'const U = "https://couchdb.example.net/weather";' },
      /CouchDB or Couchbase reference/,
    ],
    [
      "a Redis connection string",
      { "src/x.ts": 'const U = "rediss://cache.example.net";' },
      /Redis connection string/,
    ],
  ];
  it.each(cases)("fails on %s", (_name, files, expected) => {
    const result = run(project(files));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(expected);
  });

  it.each(["mongodb", "mongoose", "pg", "pouchdb", "nano", "@vercel/postgres"])(
    "fails on the %s package",
    (name) => {
      const result = run(
        project({
          "package.json": JSON.stringify({ dependencies: { [name]: "1" } }),
        }),
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(name);
    },
  );

  it("fails on a database client deeper in the lockfile", () => {
    const lock = {
      packages: { "": {}, "node_modules/foo/node_modules/mongoose": {} },
    };
    const result = run(project({ "package-lock.json": JSON.stringify(lock) }));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/package-lock\.json: .*mongoose/);
  });
});

describe("a direct provider call", () => {
  it.each([
    ["Open-Meteo", 'fetch("https://api.open-meteo.com/v1/forecast");'],
    ["Tomorrow.io", 'fetch("https://api.tomorrow.io/v4/weather");'],
  ])("fails on %s", (_name, source) => {
    const result = run(project({ "src/x.ts": source }));
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/direct call to/);
  });

  it("allows a comment that only names the model", () => {
    expect(
      run(project({ "src/x.ts": "// Open-Meteo and Tomorrow.io feed the API" }))
        .status,
    ).toBe(0);
  });
});

describe("a Mukoko host that is not on the allow-list", () => {
  it("fails, so a new host must be added on purpose", () => {
    const result = run(
      project({ "src/x.ts": 'fetch("https://staging.mukoko.com/v1");' }),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/staging\.mukoko\.com is a Mukoko host/);
  });

  it("keeps one door: a second Mukoko host, the tiles Worker's included, is refused", () => {
    // Owner, 2026-11-01: "there's only one way into the thing". The weather
    // overlay and base map tiles are requested as API routes on the one host.
    for (const host of ["weather-tiles.mukoko.com", "tiles.mukoko.com"]) {
      const result = run(
        project({ "src/x.ts": `fetch("https://${host}/v1/map-tiles");` }),
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${host} is a Mukoko host`);
    }
  });

  it("does not mistake a look-alike for an allowed host", () => {
    const result = run(
      project({
        "src/x.ts": 'fetch("https://weather-api.mukoko.com.evil.example");',
      }),
    );
    expect(result.status).toBe(0); // not a Mukoko host at all
    const own = run(
      project({ "src/x.ts": 'fetch("https://evil-api.mukoko.com/v1");' }),
    );
    expect(own.status).toBe(1);
  });

  it("reads email addresses and other hosts without complaint", () => {
    expect(
      run(
        project({
          "README.md":
            "Write to hi@mukoko.com. See https://docs.expo.dev and https://workos.com/docs.\n",
        }),
      ).status,
    ).toBe(0);
  });
});
