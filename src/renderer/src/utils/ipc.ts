export const loadVideoDialog = async () => {
  console.log("Loading video dialog...");

  await window.electron.ipcRenderer.send("start-file-browser");
};

export const loadFileBrowser = () => {
  console.log("Loading file browser...");

  return window.electron.ipcRenderer.invoke("start-file-browser");
};

export const openFileDialog = () => {
  console.log("Opening file dialog...");

  return window.electron.ipcRenderer.invoke("open-file-dialog");
};

export const openFolderDialog = () => {
  console.log("Opening folder dialog...");

  return window.electron.ipcRenderer.invoke("open-folder-dialog");
};
