import { Schema } from "effect";

export class FileSystemError extends Schema.TaggedErrorClass<FileSystemError>()("FileSystemError", {
  cause: Schema.Defect(),
  operation: Schema.String,
  path: Schema.String,
}) {}

export class MediaProbeError extends Schema.TaggedErrorClass<MediaProbeError>()("MediaProbeError", {
  cause: Schema.Defect(),
  path: Schema.String,
}) {}

export class PersistedStoreError extends Schema.TaggedErrorClass<PersistedStoreError>()(
  "PersistedStoreError",
  {
    cause: Schema.Defect(),
    name: Schema.String,
    operation: Schema.String,
  },
) {}

export class WindowError extends Schema.TaggedErrorClass<WindowError>()("WindowError", {
  cause: Schema.Defect(),
  operation: Schema.String,
}) {}

export class WorkerPoolError extends Schema.TaggedErrorClass<WorkerPoolError>()("WorkerPoolError", {
  cause: Schema.Defect(),
  path: Schema.String,
}) {}
