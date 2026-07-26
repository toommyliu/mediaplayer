import { Option, Schema } from "effect";

const PreviousDirectoryJson = Schema.fromJsonString(
  Schema.Struct({
    path: Schema.String,
  }),
);
const decodePreviousDirectory = Schema.decodeUnknownOption(PreviousDirectoryJson);

export function parsePreviousDirectory(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodePreviousDirectory(value);
  if (Option.isSome(decoded)) return decoded.value.path;
  return value.trimStart().startsWith("{") ? null : value;
}
