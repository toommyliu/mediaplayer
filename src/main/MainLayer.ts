import { Layer } from "effect";
import { InputLayer } from "./input/Layer";
import { IpcInvokeLayer } from "./ipc/InvokeLayer";
import { RendererEventsLayer } from "./ipc/Layer";
import { LoggerLayer } from "./logging/Layer";
import { MediaLayer } from "./media/Layer";
import { MenuLayer } from "./menu/Layer";
import { UserDataLayer } from "./user-data/Layer";
import { WindowLayer } from "./windows/Layer";

const WindowDomainLayer = WindowLayer.pipe(Layer.provide(LoggerLayer));
const UserDataDomainLayer = UserDataLayer.pipe(Layer.provide(LoggerLayer));
const MediaDomainLayer = MediaLayer.pipe(
  Layer.provide(LoggerLayer),
  Layer.provide(WindowDomainLayer),
  Layer.provide(UserDataDomainLayer),
);

const CoreLayer = Layer.mergeAll(
  LoggerLayer,
  WindowDomainLayer,
  MediaDomainLayer,
  UserDataDomainLayer,
  RendererEventsLayer,
);

const IpcLayer = IpcInvokeLayer.pipe(Layer.provide(CoreLayer));
const AppMenuLayer = MenuLayer.pipe(Layer.provide(CoreLayer));
const ShortcutsLayer = InputLayer.pipe(Layer.provide(CoreLayer));

export const MainLayer = Layer.mergeAll(
  CoreLayer,
  IpcLayer,
  AppMenuLayer,
  ShortcutsLayer,
);
