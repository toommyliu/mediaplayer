export function makeQueueId(path: string): string {
  return `${path}-${crypto.randomUUID()}`;
}
