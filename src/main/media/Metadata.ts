import type { VideoMetadata } from "../../shared/contracts";
import { Predicate } from "effect";

export type ProbeRecord = Record<PropertyKey, unknown>;

function record(value: unknown): ProbeRecord | undefined {
  return Predicate.isObject(value) ? value : undefined;
}

function text(value: unknown): string | undefined {
  return Predicate.isString(value) && value.length > 0 ? value : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = Predicate.isNumber(value)
    ? value
    : Predicate.isString(value)
      ? Number.parseFloat(value)
      : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseFrameRate(value: string | undefined): number | undefined {
  if (!value || value === "0/0") return undefined;
  const [numerator, denominator] = value.split("/").map(Number);
  const parsed = denominator ? numerator / denominator : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseProbeOutput(stdout: string): ProbeRecord {
  const parsed: unknown = JSON.parse(stdout);
  if (!Predicate.isObject(parsed)) {
    throw new Error("ffprobe returned invalid metadata");
  }
  return parsed;
}

function streamFor(probe: ProbeRecord, codecType: "audio" | "video"): ProbeRecord | undefined {
  if (!Array.isArray(probe.streams)) return undefined;
  return probe.streams.map(record).find((stream) => stream?.codec_type === codecType);
}

export function mergeProbeMetadata(metadata: VideoMetadata, probe: ProbeRecord): VideoMetadata {
  const format = record(probe.format);
  const video = streamFor(probe, "video");
  const audio = streamFor(probe, "audio");

  if (format) {
    metadata.format = {
      bitrateBitsPerSecond: positiveNumber(format.bit_rate),
      durationSeconds: positiveNumber(format.duration),
      formatName: text(format.format_name),
    };
  }

  if (video) {
    metadata.video = {
      bitrateBitsPerSecond: positiveNumber(video.bit_rate),
      codecLongName: text(video.codec_long_name),
      codecName: text(video.codec_name),
      displayAspectRatio: text(video.display_aspect_ratio),
      frameRate: parseFrameRate(text(video.avg_frame_rate) ?? text(video.r_frame_rate)),
      height: positiveNumber(video.height),
      width: positiveNumber(video.width),
    };
  }

  if (audio) {
    metadata.audio = {
      bitrateBitsPerSecond: positiveNumber(audio.bit_rate),
      channelLayout: text(audio.channel_layout),
      channels: positiveNumber(audio.channels),
      codecLongName: text(audio.codec_long_name),
      codecName: text(audio.codec_name),
      sampleRateHz: positiveNumber(audio.sample_rate),
    };
  }

  return metadata;
}
