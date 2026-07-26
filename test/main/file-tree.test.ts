import { describe, expect, it } from "vitest";
import { DEFAULT_SORT_OPTIONS } from "../../src/shared/constants";
import {
  buildSortedFileTree,
  isHidden,
  isVideoFile,
  normalizePath,
} from "../../src/main/media/FileTree";

describe("FileTree", () => {
  it("normalizes paths and recognizes visible video files", () => {
    expect(normalizePath(String.raw`C:\Videos\clip.MKV`)).toBe("C:/Videos/clip.MKV");
    expect(isHidden(".library")).toBe(true);
    expect(isHidden("library")).toBe(false);
    expect(isVideoFile("clip.MKV")).toBe(true);
    expect(isVideoFile("clip.txt")).toBe(false);
  });

  it("sorts folders first and recursively applies natural name ordering", () => {
    const tree = buildSortedFileTree(
      [
        { name: "clip10.mp4", path: "/clip10.mp4", type: "video", duration: 10 },
        { name: "clip2.mp4", path: "/clip2.mp4", type: "video", duration: 2 },
        {
          name: "Season",
          path: "/Season",
          type: "folder",
          files: [
            { name: "episode11.mkv", path: "/Season/episode11.mkv", type: "video" },
            { name: "episode3.mkv", path: "/Season/episode3.mkv", type: "video" },
          ],
        },
      ],
      DEFAULT_SORT_OPTIONS,
    );

    expect(tree.map((item) => item.name)).toEqual(["Season", "clip2.mp4", "clip10.mp4"]);
    expect(tree[0].files?.map((item) => item.name)).toEqual(["episode3.mkv", "episode11.mkv"]);
  });
});
