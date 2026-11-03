/**
 * A page opened while the map or the ⋯ menu is up (a shared link, a menu row,
 * a notification) is a `card` above a modal, which iOS draws BEHIND the modal,
 * so nothing seems to happen (issue #76). The rule here finds that case in the
 * navigation state: a modal route that is no longer the top of its stack. The
 * guard (src/components/shell/ModalGuard.tsx) then drops the covered modal, so
 * the page shows as a normal push.
 *
 * Pure, so it is tested without a navigator.
 */

/** The root stack's modal routes (src/app/_layout.tsx). */
export const MODAL_ROUTES: ReadonlySet<string> = new Set([
  "menu",
  "map",
  "sign-in",
  "sign-in-callback",
]);

export type NavRoute = { key: string; name: string; state?: NavState };
export type NavState = {
  key?: string;
  index?: number;
  routes: NavRoute[];
  [extra: string]: unknown;
};

/**
 * The stack to fix and its new state (the covered modals removed), or null
 * when no modal is covered. Searches nested navigators, nearest first.
 */
export function uncoverModals(
  state: NavState | undefined,
): { target: string; state: NavState } | null {
  if (!state?.routes?.length) return null;
  // A modal is covered only by a page (a card) above it. A modal opened on a
  // modal (sign-in from the menu) is a normal stack of sheets and stays.
  let lastPage = -1;
  state.routes.forEach((r, i) => {
    if (!MODAL_ROUTES.has(r.name)) lastPage = i;
  });
  const covered = state.routes.some(
    (r, i) => i < lastPage && MODAL_ROUTES.has(r.name),
  );
  if (covered && state.key) {
    const routes = state.routes.filter(
      (r, i) => i >= lastPage || !MODAL_ROUTES.has(r.name),
    );
    return {
      target: state.key,
      state: { ...state, routes, index: routes.length - 1 },
    };
  }
  for (const route of state.routes) {
    const nested = uncoverModals(route.state);
    if (nested) return nested;
  }
  return null;
}
