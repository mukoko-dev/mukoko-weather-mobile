/**
 * Keeps a page from opening behind the map or the ⋯ menu (issue #76): when a
 * route lands above one of those modals, the covered modal is removed from
 * the stack, so the new page is on top and drawn as a normal push. The rule
 * is src/shell/covered-modals.ts. Renders nothing.
 */

import { useNavigationContainerRef } from "expo-router";
import { useEffect } from "react";

import { type NavState, uncoverModals } from "@/shell/covered-modals";

export function ModalGuard() {
  const ref = useNavigationContainerRef();
  useEffect(() => {
    if (!ref) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // After the event, never inside it: changing the stack while it is
    // still being presented races the native transition. The state is read
    // again then, so a change made meanwhile is respected.
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const fix = uncoverModals(ref.getRootState() as unknown as NavState);
        if (!fix) return;
        ref.dispatch({
          type: "RESET",
          payload: fix.state,
          target: fix.target,
        } as never);
      }, 0);
    };
    const unsubscribe = ref.addListener("state", check);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [ref]);
  return null;
}
