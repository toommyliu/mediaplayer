import { client } from "@/tipc";

export function showItemInFolder(path: string): void {
  void client.showItemInFolder(path);
}
