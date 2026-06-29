/**
 * WorkOS AuthKit integration for Mukoko mobile.
 *
 * APPROACH: hosted AuthKit page via expo-auth-session (OAuth 2.0 Code + PKCE).
 *
 * Why not the native SDK? As of writing there is no first-party
 * @workos-inc/authkit-react-native package. The recommended pattern from
 * WorkOS docs (https://workos.com/docs/user-management/native-sso) is to
 * open the hosted AuthKit page in an in-app browser session and complete
 * the code exchange against your own backend.
 *
 * Flow:
 *   1. User taps "Sign in" on /sign-in
 *   2. App constructs `${AUTHKIT_DOMAIN}/oauth2/authorize?client_id=...
 *      &redirect_uri=mukoko://sign-in-callback&response_type=code
 *      &code_challenge=<sha256(verifier)>&code_challenge_method=S256
 *      &provider=authkit`
 *   3. expo-web-browser opens it; user signs in / signs up
 *   4. WorkOS redirects to mukoko://sign-in-callback?code=<authcode>
 *   5. We POST the code to mukoko-weather's `/callback` (or
 *      a dedicated `/api/py/auth/mobile/exchange` once it exists) and
 *      receive a session JWT (or access token + refresh token).
 *   6. JWT goes into SecureStore; setAuthTokenResolver wires it into apiFetch.
 *
 * TODO: the mobile-specific code-exchange route on mukoko-weather is not yet
 * built — see Phase 1B notes in README. Until then `completeSignIn` will
 * persist the raw `code` and resolve so the rest of the flow can be tested.
 */

import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { apiFetch, setAuthTokenResolver } from '@/api/client';

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = 'mukoko.session';
const PKCE_VERIFIER_KEY = 'mukoko.pkceVerifier';

const AUTHKIT_DOMAIN =
  process.env.EXPO_PUBLIC_WORKOS_AUTHKIT_DOMAIN ?? 'https://auth.mukoko.com';
const WORKOS_CLIENT_ID = process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID ?? '';
const REDIRECT_SCHEME = 'mukoko';
const REDIRECT_PATH = 'sign-in-callback';

export type Session = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  email?: string;
};

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getSession(): Promise<Session | null> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

async function persistSession(session: Session): Promise<void> {
  await setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await deleteItem(SESSION_KEY);
}

/**
 * Wire the session token into the API client. Call once at app boot from
 * the root layout so every apiFetch picks up the Authorization header.
 */
export function initAuth() {
  setAuthTokenResolver(async () => {
    const session = await getSession();
    return session?.accessToken ?? null;
  });
}

/** PKCE verifier: 64 chars from RFC 7636 unreserved alphabet. */
function randomVerifier(length = 64): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = Crypto.getRandomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: REDIRECT_SCHEME,
    path: REDIRECT_PATH,
  });
}

/**
 * Kick off the AuthKit hosted sign-in. Opens an in-app browser session,
 * waits for the redirect back to mukoko://sign-in-callback?code=..., and
 * returns the raw authorization code. The caller is responsible for
 * exchanging the code via `completeSignIn` (typically done from the
 * /sign-in-callback route to keep flow logic centralised).
 */
export async function startSignIn(): Promise<
  | { type: 'success'; code: string }
  | { type: 'cancel' }
  | { type: 'error'; message: string }
> {
  if (!WORKOS_CLIENT_ID) {
    return {
      type: 'error',
      message: 'Missing EXPO_PUBLIC_WORKOS_CLIENT_ID — set it in your .env',
    };
  }

  const verifier = randomVerifier();
  const challenge = await sha256Base64Url(verifier);
  await setItem(PKCE_VERIFIER_KEY, verifier);

  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: WORKOS_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    provider: 'authkit',
  });

  const authorizeUrl = `${AUTHKIT_DOMAIN}/oauth2/authorize?${params.toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUri, {
    showInRecents: false,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { type: 'cancel' };
  }
  if (result.type !== 'success' || !result.url) {
    return { type: 'error', message: `Unexpected result: ${result.type}` };
  }

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (!code) {
    return { type: 'error', message: error ?? 'No code in callback URL' };
  }
  return { type: 'success', code };
}

/**
 * Exchange the authorization code for a session.
 *
 * STATUS: stubbed exchange. The web app's /callback route is HTTP-only-cookie
 * based and not directly callable from native. Once mukoko-weather exposes
 * POST /api/py/auth/mobile/exchange { code, codeVerifier, redirectUri },
 * flip EXCHANGE_ENABLED to true.
 */
const EXCHANGE_ENABLED = false;

export async function completeSignIn(code: string): Promise<Session> {
  const verifier = (await getItem(PKCE_VERIFIER_KEY)) ?? '';
  await deleteItem(PKCE_VERIFIER_KEY);

  if (!EXCHANGE_ENABLED) {
    const stub: Session = {
      accessToken: `stub.${code.slice(0, 12)}`,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    await persistSession(stub);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[auth] code exchange stubbed; persisted stub session');
    }
    return stub;
  }

  const session = await apiFetch<Session>('/api/py/auth/mobile/exchange', {
    method: 'POST',
    json: {
      code,
      codeVerifier: verifier,
      redirectUri: getRedirectUri(),
    },
  });
  await persistSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await clearSession();
}
