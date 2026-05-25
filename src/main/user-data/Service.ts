import type { Effect } from "effect";
import { ServiceMap } from "effect";

export interface PersistedStoreWrite {
  name: string;
  value: string;
}

export interface UserDataServiceShape {
  readPersistedStore: (name: string) => Effect.Effect<string | null>;
  removePersistedStore: (name: string) => Effect.Effect<void>;
  writePersistedStore: (input: PersistedStoreWrite) => Effect.Effect<void>;
}

export class UserDataService extends ServiceMap.Service<
  UserDataService,
  UserDataServiceShape
>()("main/user-data/UserDataService") {}
