/**
 * Sign-in is switched off until the API can exchange the authorization code
 * for a session. While it is, the app must say so, open no browser, store no
 * session, and drop the made-up "stub." session an earlier build wrote.
 */

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

import {
  SIGN_IN_AVAILABLE,
  SIGN_IN_UNAVAILABLE_MESSAGE,
  SignInUnavailableError,
  clearSession,
  completeSignIn,
  getSession,
  signOut,
  startSignIn,
} from "@/api/auth";
import { mockFetch } from "@/api/mock-fetch";

const SESSION_KEY = "mukoko.session";

beforeEach(async () => {
  await clearSession();
});

describe("while sign-in is switched off", () => {
  it("is off", () => {
    expect(SIGN_IN_AVAILABLE).toBe(false);
    expect(SIGN_IN_UNAVAILABLE_MESSAGE).toMatch(/isn't available yet/i);
  });

  it("starts nothing: no browser, an honest message", async () => {
    const open = jest.spyOn(WebBrowser, "openAuthSessionAsync");
    const result = await startSignIn();
    expect(result).toEqual({
      type: "unavailable",
      message: SIGN_IN_UNAVAILABLE_MESSAGE,
    });
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("completes nothing: it throws, stores no session and makes no request", async () => {
    const calls = mockFetch();
    await expect(completeSignIn("code_abcdef123456")).rejects.toBeInstanceOf(
      SignInUnavailableError,
    );
    expect(await getSession()).toBeNull();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("getSession", () => {
  it("drops the made-up session an earlier build stored", async () => {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify({ accessToken: "stub.code_abcdef", expiresAt: 1 }),
    );
    expect(await getSession()).toBeNull();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it("returns a real session untouched", async () => {
    const session = { accessToken: "eyJ.real.token", email: "a@example.org" };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    expect(await getSession()).toEqual(session);
  });

  it("ignores a stored value that is not JSON", async () => {
    await SecureStore.setItemAsync(SESSION_KEY, "not json");
    expect(await getSession()).toBeNull();
  });

  it("is cleared by sign out", async () => {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify({ accessToken: "eyJ.real.token" }),
    );
    await signOut();
    expect(await getSession()).toBeNull();
  });
});
