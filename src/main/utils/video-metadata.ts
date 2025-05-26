import { promisify } from "util";
import { execFile } from "child_process";
const ffprobe = require("ffprobe-static");

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  duration: number;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  size?: number;
}

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  try {
    const { stdout } = await execFileAsync(ffprobe, [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
    ]);

    const metadata = JSON.parse(stdout);

    // Find the video stream
    const videoStream = metadata.streams?.find((stream: any) => stream.codec_type === "video");

    if (!videoStream) {
      console.warn(`No video stream found in ${filePath}`);
      return null;
    }

    // Extract duration from format or video stream
    const duration = parseFloat(metadata.format?.duration || videoStream.duration || "0");

    // Extract other metadata
    const width = videoStream.width;
    const height = videoStream.height;

    // Parse frame rate from fraction format like "30/1" or "29.97/1"
    let frameRate: number | undefined;
    if (videoStream.avg_frame_rate && videoStream.avg_frame_rate !== "0/0") {
      const [numerator, denominator] = videoStream.avg_frame_rate.split("/").map(Number);
      if (denominator && denominator !== 0) {
        frameRate = numerator / denominator;
      }
    }

    const bitrate = parseInt(metadata.format?.bit_rate || videoStream.bit_rate || "0");
    const codec = videoStream.codec_name;
    const size = parseInt(metadata.format?.size || "0");

    return {
      duration,
      width,
      height,
      frameRate,
      bitrate,
      codec,
      size
    };
  } catch (error) {
    console.error(`Error getting metadata for ${filePath}:`, error);
    return null;
  }
}

export async function getVideoDuration(filePath: string): Promise<number> {
  try {
    console.log("filePath", filePath);
    const metadata = await getVideoMetadata(filePath);
    return metadata?.duration || 0;
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error);
    return 0;
  }
}
