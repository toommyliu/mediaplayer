import { Worker } from "node:worker_threads";

export interface WorkerTask {
  id: number;
  filePath: string;
  resolve: (duration: number) => void;
  reject: (error: Error) => void;
}

interface WorkerResponse {
  id: number;
  duration?: number;
  error?: string;
}

const DEFAULT_CACHE_MAX_ENTRIES = 10_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  duration: number;
  expiresAt: number;
}

export class WorkerPool {
  private workers = new Set<Worker>();
  private availableWorkers: Worker[] = [];
  private activeTasks = new Map<Worker, WorkerTask>();
  private taskQueue: WorkerTask[] = [];
  private queueHead = 0;
  private taskById = new Map<number, WorkerTask>();
  private inFlightByPath = new Map<string, Promise<number>>();
  private cache = new Map<string, CacheEntry>();
  private isTerminating = false;
  private taskIdCounter = 0;
  private readonly poolSize: number;
  private readonly workerPath: string;
  private readonly cacheMaxEntries: number;
  private readonly cacheTtlMs: number;

  constructor(
    poolSize: number,
    workerPath: string,
    options?: {
      cacheMaxEntries?: number;
      cacheTtlMs?: number;
    },
  ) {
    this.poolSize = poolSize;
    this.workerPath = workerPath;
    this.cacheMaxEntries =
      options?.cacheMaxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
    this.cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }

    this.dispatchTasks();
  }

  async processFile(filePath: string): Promise<number> {
    if (this.isTerminating) {
      throw new Error("Worker pool is terminating");
    }

    const cached = this.getCached(filePath);
    if (cached !== undefined) {
      return cached;
    }

    const inFlight = this.inFlightByPath.get(filePath);
    if (inFlight) {
      return inFlight;
    }

    const taskPromise = new Promise<number>((resolve, reject) => {
      const task: WorkerTask = {
        id: this.taskIdCounter++,
        filePath,
        resolve,
        reject,
      };

      this.taskById.set(task.id, task);
      this.taskQueue.push(task);
      this.dispatchTasks();
    });

    this.inFlightByPath.set(filePath, taskPromise);

    return await taskPromise.finally(() => {
      this.inFlightByPath.delete(filePath);
    });
  }

  async processFiles(
    filePaths: readonly string[],
    onError?: (path: string, error: Error) => void,
  ): Promise<Map<string, number>> {
    const uniquePaths = Array.from(new Set(filePaths));
    const results = await Promise.all(
      uniquePaths.map(async (filePath) => {
        try {
          const duration = await this.processFile(filePath);
          return [filePath, duration] as const;
        } catch (error) {
          const workerError =
            error instanceof Error ? error : new Error(String(error));
          onError?.(filePath, workerError);
          return [filePath, 0] as const;
        }
      }),
    );

    return new Map(results);
  }

  private createWorker(): Worker {
    const worker = new Worker(this.workerPath, {
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
      },
    });

    worker.on("message", (response: WorkerResponse) => {
      this.handleWorkerMessage(worker, response);
    });
    worker.on("error", (error) => {
      this.handleWorkerError(worker, error);
    });
    worker.on("exit", (code) => {
      this.handleWorkerExit(worker, code);
    });

    this.workers.add(worker);
    this.availableWorkers.push(worker);
    return worker;
  }

  private dispatchTasks(): void {
    while (!this.isTerminating && this.availableWorkers.length > 0) {
      const task = this.dequeueTask();
      if (!task) {
        return;
      }

      const worker = this.availableWorkers.pop();
      if (!worker) {
        return;
      }

      this.activeTasks.set(worker, task);

      try {
        worker.postMessage({ id: task.id, filePath: task.filePath });
      } catch (error) {
        this.activeTasks.delete(worker);
        this.availableWorkers.push(worker);
        const workerError =
          error instanceof Error ? error : new Error(String(error));
        this.completeTask(task, undefined, workerError);
      }
    }
  }

  private dequeueTask(): WorkerTask | undefined {
    if (this.queueHead >= this.taskQueue.length) {
      if (this.queueHead > 0) {
        this.taskQueue = [];
        this.queueHead = 0;
      }

      return undefined;
    }

    const task = this.taskQueue[this.queueHead];
    this.queueHead += 1;

    if (this.queueHead > 1024 && this.queueHead * 2 > this.taskQueue.length) {
      this.taskQueue = this.taskQueue.slice(this.queueHead);
      this.queueHead = 0;
    }

    return task;
  }

  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    const task = this.activeTasks.get(worker);
    if (!task || response.id !== task.id) {
      return;
    }

    this.activeTasks.delete(worker);

    if (!this.isTerminating) {
      this.availableWorkers.push(worker);
    }

    if (response.error) {
      this.completeTask(task, undefined, new Error(response.error));
    } else {
      const duration = response.duration ?? 0;
      this.setCached(task.filePath, duration);
      this.completeTask(task, duration);
    }

    this.dispatchTasks();
  }

  private handleWorkerError(worker: Worker, error: Error): void {
    const task = this.activeTasks.get(worker);
    if (task) {
      this.activeTasks.delete(worker);
      this.completeTask(task, undefined, error);
    }

    this.removeWorker(worker);
    if (!this.isTerminating) {
      this.createWorker();
      this.dispatchTasks();
    }
  }

  private handleWorkerExit(worker: Worker, code: number): void {
    const task = this.activeTasks.get(worker);
    if (task) {
      this.activeTasks.delete(worker);
      this.completeTask(
        task,
        undefined,
        new Error(`Worker exited before completing task (code ${code})`),
      );
    }

    this.removeWorker(worker);

    if (!this.isTerminating && code !== 0) {
      this.createWorker();
      this.dispatchTasks();
    }
  }

  private removeWorker(worker: Worker): void {
    this.workers.delete(worker);
    this.availableWorkers = this.availableWorkers.filter((w) => w !== worker);
  }

  private completeTask(
    task: WorkerTask,
    duration?: number,
    error?: Error,
  ): void {
    this.taskById.delete(task.id);

    if (error) {
      task.reject(error);
      return;
    }

    task.resolve(duration ?? 0);
  }

  private getCached(filePath: string): number | undefined {
    const entry = this.cache.get(filePath);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(filePath);
      return undefined;
    }

    this.cache.delete(filePath);
    this.cache.set(filePath, entry);
    return entry.duration;
  }

  private setCached(filePath: string, duration: number): void {
    this.cache.delete(filePath);
    this.cache.set(filePath, {
      duration,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    if (this.cache.size > this.cacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  async terminate(): Promise<void> {
    this.isTerminating = true;

    const remainingTasks = [...this.taskById.values()];
    this.taskQueue = [];
    this.queueHead = 0;

    for (const task of remainingTasks) {
      task.reject(new Error("Worker pool terminated"));
    }

    this.taskById.clear();
    this.activeTasks.clear();
    this.inFlightByPath.clear();

    await Promise.all(Array.from(this.workers, (worker) => worker.terminate()));
    this.workers.clear();
    this.availableWorkers = [];
    this.cache.clear();
  }
}
