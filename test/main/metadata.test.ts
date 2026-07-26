import { describe, expect, it } from "vitest";
import {
  mergeProbeMetadata,
  parseFrameRate,
  parseProbeOutput,
} from "../../src/main/media/Metadata";

describe("Metadata", () => {
  it("parses rational frame rates and rejects invalid probe payloads", () => {
    expect(parseFrameRate("30000/1001")).toBeCloseTo(29.97, 2);
    expect(parseFrameRate("0/0")).toBeUndefined();
    expect(() => parseProbeOutput("[]")).toThrow("invalid metadata");
  });

  it("maps ffprobe output into the renderer metadata contract", () => {
    const metadata = mergeProbeMetadata(
      {
        file: {
          extension: "mkv",
          modifiedAtMs: 1,
          name: "movie.mkv",
          path: "/movie.mkv",
          sizeBytes: 10,
        },
      },
      {
        format: {
          bit_rate: "8000000",
          duration: "120.5",
          format_name: "matroska",
        },
        streams: [
          {
            avg_frame_rate: "24000/1001",
            codec_name: "h264",
            codec_type: "video",
            height: 1080,
            width: 1920,
          },
          {
            channels: 2,
            codec_name: "aac",
            codec_type: "audio",
            sample_rate: "48000",
          },
        ],
      },
    );

    expect(metadata.format).toMatchObject({
      bitrateBitsPerSecond: 8_000_000,
      durationSeconds: 120.5,
      formatName: "matroska",
    });
    expect(metadata.video).toMatchObject({
      codecName: "h264",
      height: 1080,
      width: 1920,
    });
    expect(metadata.audio).toMatchObject({
      channels: 2,
      codecName: "aac",
      sampleRateHz: 48_000,
    });
  });
});
