export interface DurationWorkerData {
  readonly ffprobePath: string;
}

export interface DurationWorkerRequest {
  readonly filePath: string;
  readonly id: number;
}

export interface DurationWorkerResponse {
  readonly duration?: number;
  readonly error?: string;
  readonly filePath: string;
  readonly id: number;
}
