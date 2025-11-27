import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { parentPort } from "node:worker_threads";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type WorkerMessage = {
  filePath: string;
  id: number;
};

type WorkerResponse = {
  id: number;
  filePath: string;
  duration?: number;
  error?: string;
};

type FfmpegProbeMetadata = {
  format?: {
    duration?: string | number;
    filename?: string;
    [key: string]: unknown;
  };
  streams?: unknown[];
  [key: string]: unknown;
};

/**
 * Execute ffprobe and return JSON metadata.
 */
async function getFfprobeMetadata(filePath: string): Promise<FfmpegProbeMetadata> {
  try {
    const args = ["-v", "error", "-show_format", "-print_format", "json", filePath];
    const { stdout } = (await execFileAsync(ffprobeInstaller.path, args)) as {
      stdout: string;
      stderr: string;
    };
    if (!stdout) return {} as FfmpegProbeMetadata;

    return JSON.parse(stdout) as FfmpegProbeMetadata;
  } catch (error) {
    throw new Error(`Error getting ffprobe metadata: ${error}`);
  }
}

/**
 * Get the duration of a video file.
 */
async function getVideoDuration(filePath: string): Promise<number> {
  const metadata = await getFfprobeMetadata(filePath);
  const rawDuration = metadata?.format?.duration;
  if (typeof rawDuration === "number") return rawDuration;

  const parsed = parseFloat(String(rawDuration ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Listen for messages from the main thread
if (parentPort) {
  parentPort.on("message", async (message: WorkerMessage) => {
    const response: WorkerResponse = {
      id: message.id,
      filePath: message.filePath
    };

    try {
      const duration = await getVideoDuration(message.filePath);
      response.duration = duration;
    } catch (error) {
      response.error = error instanceof Error ? error.message : String(error);
    }

    parentPort!.postMessage(response);
  });
}
