class PlatformState {
  public isMac = $state(false);

  public isWindows = $state(false);

  public isLinux = $state(false);
}

export const platformState = new PlatformState();
