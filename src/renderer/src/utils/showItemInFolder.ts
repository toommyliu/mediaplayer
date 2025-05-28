import { client } from "@/client";

export function showItemInFolder(path: string): void {
  void client.showItemInFolder(path);
}
