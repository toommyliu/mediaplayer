import { Worker } from "node:worker_threads";

export type WorkerTask = {
  id: number;
  filePath: string;
  resolve: (duration: number) => void;
  reject: (error: Error) => void;
};

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private taskIdCounter = 0;
  private readonly poolSize: number;
  private readonly workerPath: string;

  constructor(poolSize: number, workerPath: string) {
    this.poolSize = poolSize;
    this.workerPath = workerPath;
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerPath);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async processFile(filePath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const task: WorkerTask = {
        id: this.taskIdCounter++,
        filePath,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  private processNextTask(): void {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const task = this.taskQueue.shift()!;
    const worker = this.availableWorkers.shift()!;

    const onMessage = (response: { id: number; duration?: number; error?: string }) => {
      if (response.id === task.id) {
        worker.off("message", onMessage);
        worker.off("error", onError);
        this.availableWorkers.push(worker);

        if (response.error) {
          task.reject(new Error(response.error));
        } else {
          task.resolve(response.duration ?? 0);
        }

        this.processNextTask();
      }
    };

    const onError = (error: Error) => {
      worker.off("message", onMessage);
      worker.off("error", onError);
      this.availableWorkers.push(worker);
      task.reject(error);
      this.processNextTask();
    };

    worker.on("message", onMessage);
    worker.on("error", onError);

    worker.postMessage({ id: task.id, filePath: task.filePath });
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.availableWorkers = [];
  }
}
