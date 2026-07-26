import { Layer } from "effect";
import { Shutdown } from "./application/Shutdown";
import { ApplicationLifecycleLayer } from "./electron/ApplicationLifecycle";
import { ApplicationMenuLayer } from "./electron/ApplicationMenu";
import { DesktopShell } from "./electron/DesktopShell";
import { MediaPicker } from "./electron/MediaPicker";
import { MediaShortcutsLayer } from "./electron/MediaShortcuts";
import { WindowManager } from "./electron/WindowManager";
import { IpcServerLayer } from "./ipc/IpcServer";
import { RendererEvents } from "./ipc/RendererEvents";
import { DurationWorkerPool } from "./media/DurationWorkerPool";
import { MediaFileSystem } from "./media/MediaFileSystem";
import { MediaLibrary } from "./media/MediaLibrary";
import { MediaTools } from "./media/MediaTools";
import { PersistedStore } from "./persistence/PersistedStore";
import { ElectronCallbacks } from "./runtime/ElectronCallbacks";

const InfrastructureLayer = Layer.mergeAll(
  DesktopShell.layer,
  DurationWorkerPool.layer,
  ElectronCallbacks.layer,
  MediaFileSystem.layer,
  MediaTools.layer,
  PersistedStore.layer,
  RendererEvents.layer,
  Shutdown.layer,
);

const WindowLayer = WindowManager.layer.pipe(Layer.provideMerge(InfrastructureLayer));

const MediaLibraryLayer = MediaLibrary.layer.pipe(Layer.provideMerge(WindowLayer));

const ServiceLayer = MediaPicker.layer.pipe(Layer.provideMerge(MediaLibraryLayer));

const FeatureLayer = Layer.mergeAll(
  ApplicationLifecycleLayer,
  ApplicationMenuLayer,
  IpcServerLayer,
  MediaShortcutsLayer,
);

export const MainLayer = FeatureLayer.pipe(Layer.provideMerge(ServiceLayer));
