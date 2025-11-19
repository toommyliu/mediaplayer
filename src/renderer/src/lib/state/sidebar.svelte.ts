import { SidebarTab } from "$/types";
import { PersistedState } from "runed";

export type SidebarPosition = "left" | "right";

class SidebarState {
  public readonly MIN_WIDTH = 15; // 15% of viewport width
  public readonly MAX_WIDTH = 40; // 40% of viewport width
  public readonly DEFAULT_WIDTH = 20; // 20% of viewport width

  public isOpen = $state(true);

  public currentTab = $state<SidebarTab>(SidebarTab.FileBrowser)

  private _width = new PersistedState<number>("sidebar:width", this.DEFAULT_WIDTH);
  private _position = new PersistedState<SidebarPosition>("sidebar:position", "left");

  public get width(): number {
    const current = this._width.current;
    if (current < this.MIN_WIDTH || current > this.MAX_WIDTH) {
      this._width.current = Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, current));
    }
    return this._width.current;
  }

  public set width(value: number) {
    const clamped = Math.round(Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, value)) * 10) / 10;
    this._width.current = clamped;
  }

  public get position(): SidebarPosition {
    return this._position.current;
  }

  public set position(value: SidebarPosition) {
    this._position.current = value;
  }
  
  public reset(): void {
    this._width.current = this.DEFAULT_WIDTH;
  }

  /**
   * Toggle sidebar open/closed state
   */
  public toggle(): void {
    this.isOpen = !this.isOpen;
  }
}

export const sidebarState = new SidebarState();
