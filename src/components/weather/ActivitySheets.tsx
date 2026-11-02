/**
 * Where the activity picker and the activity advice sheet live: one provider
 * on the weather page holds both sheets, and the Community lane, the activity
 * invitation and the sheets themselves ask it to open one (`useActivitySheets`).
 * One instance of each sheet, so two entry points can never open two.
 *
 * "Edit" in the advice sheet closes it and opens the picker after the first
 * sheet has gone: iOS cannot present a sheet while another is still leaving.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type WeatherData } from "@/shared/weather";

import { ActivitiesSheet } from "./ActivitiesSheet";
import { ActivityPickerSheet } from "./ActivityPickerSheet";

/** Time for one sheet to finish leaving before the next one is presented. */
export const SHEET_SWAP_MS = 450;

type Sheets = {
  openPicker: () => void;
  /** Open the advice sheet, scrolled to one activity when an id is given. */
  openAdvice: (activityId?: string) => void;
};

const NOOP: Sheets = {
  openPicker: () => undefined,
  openAdvice: () => undefined,
};

const SheetsContext = createContext<Sheets>(NOOP);

export function useActivitySheets(): Sheets {
  return useContext(SheetsContext);
}

export type ActivitySheetsProviderProps = {
  forecast: WeatherData | undefined;
  now: Date;
  children: ReactNode;
};

export function ActivitySheetsProvider({
  forecast,
  now,
  children,
}: ActivitySheetsProviderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const openAdvice = useCallback((activityId?: string) => {
    setFocusId(activityId);
    setAdviceOpen(true);
  }, []);
  const editFromAdvice = useCallback(() => {
    setAdviceOpen(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPickerOpen(true), SHEET_SWAP_MS);
  }, []);

  const value = useMemo(
    () => ({ openPicker, openAdvice }),
    [openPicker, openAdvice],
  );

  return (
    <SheetsContext.Provider value={value}>
      {children}
      <ActivityPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
      {forecast ? (
        <ActivitiesSheet
          visible={adviceOpen}
          onClose={() => setAdviceOpen(false)}
          onEdit={editFromAdvice}
          focusActivityId={focusId}
          forecast={forecast}
          now={now}
        />
      ) : null}
    </SheetsContext.Provider>
  );
}
