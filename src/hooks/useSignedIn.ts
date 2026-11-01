/**
 * Whether a person is signed in, for the AI surfaces that are for signed-in
 * people only (the web's rule). `available` is the app's sign-in switch
 * (`SIGN_IN_AVAILABLE`, off today: there is no token exchange route yet), so
 * with it off `signedIn` is false and no session is read or faked.
 */

import { useEffect, useState } from "react";

import { getSession, SIGN_IN_AVAILABLE } from "@/api/auth";

export function useSignedIn(available: boolean = SIGN_IN_AVAILABLE): {
  available: boolean;
  signedIn: boolean;
} {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!available) {
      setSignedIn(false);
      return;
    }
    let alive = true;
    void getSession().then((s) => {
      if (alive) setSignedIn(s !== null);
    });
    return () => {
      alive = false;
    };
  }, [available]);

  return { available, signedIn: available && signedIn };
}
