import { getPlatform } from "@/lib/ipc";
import { initializeQueue } from "@/lib/controllers/library-controller";
import { setPlatformState } from "@/lib/state/platform";

export async function loadPlatformInfo(): Promise<void> {
  const info = await getPlatform();
  setPlatformState({
    isLinux: info.isLinux,
    isMac: info.isMacOS,
    isWindows: info.isWindows,
    pathSep: info.pathSep
  });
}

export async function bootstrapApp(): Promise<void> {
  initializeQueue();
  await loadPlatformInfo();
}
