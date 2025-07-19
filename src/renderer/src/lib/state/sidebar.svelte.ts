import { SidebarTab } from "$/types";

class SidebarState {
  public isOpen = $state(true);

  public currentTab = $state<SidebarTab>(SidebarTab.FileBrowser);
}

export const sidebarState = new SidebarState();
