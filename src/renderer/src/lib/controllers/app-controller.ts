import { getPlatform } from "@/lib/ipc";
import { initializeQueue } from "@/lib/controllers/library-controller";
import { usePlatformStore } from "@stores/platform";

export async function loadPlatformInfo(): Promise<void> {
  const info = await getPlatform();
  usePlatformStore.getState().setPlatformState({
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
