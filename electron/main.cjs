const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

let mainWindow;
if(process.env.BLOSSOM_TEST==='1')app.setPath('userData',path.join(process.cwd(),'test-results','desktop-profile'));
function createWindow() {
  mainWindow = new BrowserWindow({
    width:1600,height:900,minWidth:1024,minHeight:640,backgroundColor:'#071c23',
    title:'Immortal Blossoms',autoHideMenuBar:true,show:false,icon:path.join(__dirname,'..','assets','icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true},
  });
  mainWindow.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://store.steampowered.com/'))shell.openExternal(url);return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('file://'))event.preventDefault();});
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  mainWindow.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){event.preventDefault();mainWindow.setFullScreen(!mainWindow.isFullScreen());}});
  mainWindow.once('ready-to-show',()=>{if(process.env.BLOSSOM_TEST!=='1')mainWindow.show();});
  mainWindow.loadFile(path.join(__dirname,'..','index.html'));
  mainWindow.on('closed',()=>{mainWindow=null;});
}
app.setName('Immortal Blossoms');
app.whenReady().then(()=>{
  ipcMain.handle('game:fullscreen',(_event,value)=>{mainWindow?.setFullScreen(Boolean(value));return mainWindow?.isFullScreen()||false;});
  ipcMain.handle('game:save-export',async(_event,text)=>{
    if(typeof text!=='string'||text.length>10_000_000)throw new Error('Invalid save data.');
    const result=await dialog.showSaveDialog(mainWindow,{title:'Export Immortal Blossoms save',defaultPath:'immortal-blossoms-save.json',filters:[{name:'Game save',extensions:['json']}]});
    if(result.canceled||!result.filePath)return false;
    await fs.writeFile(result.filePath,text,'utf8');return true;
  });
  ipcMain.handle('game:save-import',async()=>{
    const result=await dialog.showOpenDialog(mainWindow,{title:'Import Immortal Blossoms save',properties:['openFile'],filters:[{name:'Game save',extensions:['json']}]});
    if(result.canceled||!result.filePaths[0])return null;
    const stat=await fs.stat(result.filePaths[0]);if(stat.size>10_000_000)throw new Error('This save is too large.');
    return fs.readFile(result.filePaths[0],'utf8');
  });
  createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
