export function toFileUrl(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export function normalizeVideoPath(path: string): string {
  return path.startsWith("file://") ? path.slice(7) : path;
}
