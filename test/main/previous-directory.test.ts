import { describe, expect, it } from "vitest";
import { parsePreviousDirectory } from "../../src/main/media/PreviousDirectory";

describe("parsePreviousDirectory", () => {
  it("supports the current JSON format and the legacy plain-path format", () => {
    expect(parsePreviousDirectory('{"path":"/videos"}')).toBe("/videos");
    expect(parsePreviousDirectory("/legacy/videos")).toBe("/legacy/videos");
  });

  it("rejects malformed structured values", () => {
    expect(parsePreviousDirectory('{"wrong":"shape"}')).toBeNull();
    expect(parsePreviousDirectory(null)).toBeNull();
  });
});
