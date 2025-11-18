import { SidebarTab } from "$/types";
import { PersistedState } from "runed";

class SidebarState {
  public isOpen = $state(true);

  public currentTab = $state<SidebarTab>(SidebarTab.FileBrowser);

  private _width = new PersistedState<number>("sidebar:width", 20);

  public get width(): number {
    return this._width.current;
  }

  public set width(value: number) {
    // Clamp width to 8%..80% to prevent unusable sizes
    const clamped = Math.max(8, Math.min(80, Math.round(value)));
    this._width.current = clamped;
  }
}

export const sidebarState = new SidebarState();
