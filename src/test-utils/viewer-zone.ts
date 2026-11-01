/**
 * Run a describe block as a viewer in another zone. Jest gives each test file
 * its own copy of `process.env`, so assigning `TZ` cannot change the zone the
 * code sees. Instead the viewer's clock is made hostile: the zone offset is
 * the viewer's, and every local-time reader throws, so a code path that reads
 * the phone's clock instead of the place's offset fails the test.
 */
export function inViewerZone(
  tz: string,
  expectedOffsetMinutes: number,
  fn: () => void,
) {
  const LOCAL_READERS = [
    "getHours",
    "getMinutes",
    "getDate",
    "getDay",
    "getMonth",
    "getFullYear",
    "toLocaleTimeString",
    "toLocaleDateString",
    "toLocaleString",
  ] as const;
  describe(`viewer in ${tz}`, () => {
    beforeAll(() => {
      jest
        .spyOn(Date.prototype, "getTimezoneOffset")
        .mockReturnValue(-expectedOffsetMinutes);
      for (const name of LOCAL_READERS) {
        jest.spyOn(Date.prototype, name).mockImplementation(() => {
          throw new Error(`read the viewer's clock: Date#${name}`);
        });
      }
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });
    it("really is the viewer's zone and a local-time read would throw (precondition)", () => {
      expect(-new Date(Date.UTC(2026, 9, 8)).getTimezoneOffset()).toBe(
        expectedOffsetMinutes,
      );
      expect(() => new Date(Date.UTC(2026, 9, 8)).getHours()).toThrow(
        /viewer's clock/,
      );
    });
    fn();
  });
}
