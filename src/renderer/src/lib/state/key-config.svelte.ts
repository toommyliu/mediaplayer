class KeyConfigState {
  public isInitialized = $state(false);

  public modKey = $state("");
}

export const keyConfigState = new KeyConfigState();
