import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parentPort, workerData } from "node:worker_threads";
import type { DurationWorkerData, DurationWorkerRequest, DurationWorkerResponse } from "./Protocol";

const execFileAsync = promisify(execFile);
const FFPROBE_TIMEOUT_MS = 20_000;

async function getVideoDuration(ffprobePath: string, filePath: string): Promise<number> {
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

    const { stdout } = (await execFileAsync(ffprobePath, args, {
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
  const { ffprobePath } = workerData as DurationWorkerData;
  const port = parentPort;
  parentPort.on("message", async (message: DurationWorkerRequest) => {
    let response: DurationWorkerResponse;
    try {
      response = {
        duration: await getVideoDuration(ffprobePath, message.filePath),
        filePath: message.filePath,
        id: message.id,
      };
    } catch (error) {
      response = {
        error: error instanceof Error ? error.message : String(error),
        filePath: message.filePath,
        id: message.id,
      };
    }

    port.postMessage(response);
  });
}
