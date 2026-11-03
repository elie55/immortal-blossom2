const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop',Object.freeze({
  platform:process.platform,
  setFullscreen:value=>ipcRenderer.invoke('game:fullscreen',Boolean(value)),
  exportSave:text=>ipcRenderer.invoke('game:save-export',text),
  importSave:()=>ipcRenderer.invoke('game:save-import'),
}));
