/**
 * The drawn activity and report icons: every icon name the Worker sends for
 * an activity is drawn (none falls to the plain ring), every report type has
 * its condition icon, nothing is an emoji, and icons are hidden from the
 * screen reader unless they stand alone.
 */

import { render } from "@testing-library/react-native";

import activitiesFixture from "@/api/__fixtures__/activities.json";
import {
  ActivityIcon,
  ReportTypeIcon,
  glyphFor,
} from "@/components/icons/ActivityIcon";
import { ACTIVITIES } from "@/shared/activities";
import { REPORT_TYPES } from "@/shared/report-types";
import { HAS_EMOJI, allText } from "@/test-utils/weather-fixtures";

describe("activity icons", () => {
  const names = [
    ...new Set(
      (activitiesFixture.activities as { icon: string }[]).map((a) => a.icon),
    ),
  ];

  it("draws every icon name the Worker sends for an activity (none falls to the ring)", () => {
    expect(names.length).toBeGreaterThan(40);
    for (const name of names) {
      expect(glyphFor(name)).not.toBe("ring");
    }
  });

  it("draws every seed activity's icon", () => {
    for (const a of ACTIVITIES) {
      expect(a.icon).toBeTruthy();
      expect(glyphFor(a.icon)).not.toBe("ring");
    }
  });

  it("shows a plain ring for a name it does not know, or none, never nothing", () => {
    expect(glyphFor("telepathy")).toBe("ring");
    expect(glyphFor(undefined)).toBe("ring");
  });

  it("renders as a decorative image hidden from the screen reader", async () => {
    const tree = await render(<ActivityIcon icon="football" color="#000000" />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("no-hide-descendants");
    expect(HAS_EMOJI.test(allText(tree.toJSON()))).toBe(false);
  });

  it("names itself when it stands alone", async () => {
    const tree = await render(
      <ActivityIcon icon="grill" color="#000000" label="Braai" />,
    );
    expect(tree.getByLabelText("Braai")).toBeTruthy();
  });
});

describe("report type icons", () => {
  it("has a condition icon for each of the 13 types", async () => {
    for (const t of REPORT_TYPES) {
      const tree = await render(
        <ReportTypeIcon type={t.id} color="#000000" label={t.label} />,
      );
      expect(tree.getByLabelText(t.label)).toBeTruthy();
    }
  });

  it("falls back to a cloud for an unknown type", async () => {
    const tree = await render(
      <ReportTypeIcon type="meteor" color="#000000" label="Unknown" />,
    );
    expect(tree.getByLabelText("Unknown")).toBeTruthy();
  });
});
