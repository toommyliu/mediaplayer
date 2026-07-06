const FILE_URL_PREFIX = "file://";

export function toFileUrl(path: string): string {
  return path.startsWith(FILE_URL_PREFIX) ? path : `${FILE_URL_PREFIX}${path}`;
}

export function normalizeVideoPath(path: string): string {
  return path.startsWith(FILE_URL_PREFIX) ? path.slice(FILE_URL_PREFIX.length) : path;
}
