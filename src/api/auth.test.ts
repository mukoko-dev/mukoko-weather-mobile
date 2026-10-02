/**
 * authkitDomain() turns EXPO_PUBLIC_WORKOS_AUTHKIT_DOMAIN into the origin the
 * authorize URL is built on. It must never guess a host, and must never let
 * anything but an https origin through.
 */

jest.mock("expo-auth-session", () => ({}));
jest.mock("expo-crypto", () => ({}));
jest.mock("expo-secure-store", () => ({}));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));

import { AUTHKIT_DOMAIN_MISSING, authkitDomain } from "@/api/auth";

const KEY = "EXPO_PUBLIC_WORKOS_AUTHKIT_DOMAIN";
const original = process.env[KEY];

function withDomain(value: string | undefined): string {
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
  return authkitDomain();
}

afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

describe("authkitDomain", () => {
  it("fails closed when the variable is unset or blank", () => {
    expect(() => withDomain(undefined)).toThrow(AUTHKIT_DOMAIN_MISSING);
    expect(() => withDomain("   ")).toThrow(AUTHKIT_DOMAIN_MISSING);
  });

  it("accepts a bare host or an https origin, and returns the origin", () => {
    expect(withDomain("auth.example.test")).toBe("https://auth.example.test");
    expect(withDomain("https://auth.example.test/")).toBe("https://auth.example.test");
    expect(withDomain("HTTPS://Auth.Example.Test")).toBe("https://auth.example.test");
  });

  it("drops any path, query or fragment", () => {
    expect(withDomain("https://auth.example.test/x/y?z=1#f")).toBe("https://auth.example.test");
  });

  it("rejects anything that is not an https origin", () => {
    expect(() => withDomain("http://auth.example.test")).toThrow(AUTHKIT_DOMAIN_MISSING);
    expect(() => withDomain("javascript://auth.example.test")).toThrow(AUTHKIT_DOMAIN_MISSING);
    expect(() => withDomain("https://user:pass@auth.example.test")).toThrow(
      AUTHKIT_DOMAIN_MISSING,
    );
    expect(() => withDomain("https://")).toThrow(AUTHKIT_DOMAIN_MISSING);
  });
});
