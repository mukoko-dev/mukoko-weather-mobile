import {
  SWIPE_DOMINANCE_RATIO,
  SWIPE_MIN_DISTANCE_PX,
  classifySwipe,
} from "./swipe";

// Ported from mukoko-weather src/lib/use-swipe.test.ts (the classifySwipe block).

describe("classifySwipe — direction and thresholds", () => {
  it("classifies a long, clearly horizontal left move as left", () => {
    expect(classifySwipe(-120, 10)).toBe("left");
  });

  it("classifies a long, clearly horizontal right move as right", () => {
    expect(classifySwipe(120, -5)).toBe("right");
  });

  it("uses a 60px minimum horizontal distance", () => {
    expect(SWIPE_MIN_DISTANCE_PX).toBe(60);
    expect(classifySwipe(-59, 0)).toBeNull();
    expect(classifySwipe(59, 0)).toBeNull();
    expect(classifySwipe(-60, 0)).toBe("left");
    expect(classifySwipe(60, 0)).toBe("right");
  });

  it("requires |dx| to exceed 1.5x |dy| (mostly horizontal)", () => {
    expect(SWIPE_DOMINANCE_RATIO).toBe(1.5);
    // Exactly 1.5x is not enough — the rule is strictly greater than.
    expect(classifySwipe(-90, 60)).toBeNull();
    // Just over 1.5x counts.
    expect(classifySwipe(-91, 60)).toBe("left");
  });

  it("rejects a predominantly vertical gesture even when long", () => {
    expect(classifySwipe(70, 200)).toBeNull();
    expect(classifySwipe(-70, 300)).toBeNull();
  });

  it("returns null for a zero-length tap", () => {
    expect(classifySwipe(0, 0)).toBeNull();
  });

  it("accepts a custom threshold", () => {
    expect(classifySwipe(-30, 0, 20)).toBe("left");
    expect(classifySwipe(-30, 0)).toBeNull();
  });
});
