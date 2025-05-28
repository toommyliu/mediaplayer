import { client } from "@/client";

export const loadVideoDialog = async () => {
  console.log("Loading video dialog...");

  await window.electron.ipcRenderer.send("start-file-browser");
};

export const loadFileBrowser = async () => {
  console.log("Loading file browser (file or folder)...");

  return await client.selectFileOrFolder();
};

export const openFileDialog = async () => {
  console.log("Opening file dialog...");

  return await client.selectFile();
};

export const openFolderDialog = async () => {
  console.log("Opening folder dialog...");

  return await client.selectFolder();
};
