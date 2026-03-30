import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parentPort } from "node:worker_threads";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

const execFileAsync = promisify(execFile);
const FFPROBE_TIMEOUT_MS = 20_000;

interface WorkerMessage {
  filePath: string;
  id: number;
}

interface WorkerResponse {
  id: number;
  filePath: string;
  duration?: number;
  error?: string;
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ];

    const { stdout } = (await execFileAsync(ffprobeInstaller.path, args, {
      timeout: FFPROBE_TIMEOUT_MS,
      maxBuffer: 128 * 1024,
    })) as {
      stdout: string;
      stderr: string;
    };

    if (!stdout) {
      return 0;
    }

    const parsed = Number.parseFloat(stdout.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (error) {
    throw new Error(`Error getting ffprobe duration for ${filePath}: ${error}`);
  }
}

if (parentPort) {
  parentPort.on("message", async (message: WorkerMessage) => {
    const response: WorkerResponse = {
      id: message.id,
      filePath: message.filePath,
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
