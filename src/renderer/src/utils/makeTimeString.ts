export function makeTimeString(seconds: number): string {
  if (Number.isNaN(seconds)) return "00:00";

  const hrs = Math.floor(seconds / 3_600);
  const mins = Math.floor((seconds % 3_600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
