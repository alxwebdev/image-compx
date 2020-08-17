const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

// Checking environment
process.env.NODE_ENV = 'production';
const isDev = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;

// Main BrowserWindow
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'ImageCompressor',
    width: isDev ? 800 : 500,
    height: 600,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile('./app/index.html');
}

// About Window
let aboutWindow;

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: 'ImageCompressor',
    width: 300,
    height: 300,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
  });

  aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  mainWindow.on('closed', () => (mainWindow = null));
});

// Menu Template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
];

// Get data passed from Renderer
ipcMain.on('image:minimize', (e, options) => {
  options.dest = path.join(os.homedir(), 'imagecompx');
  shrinkImage(options);
});

// Imagemin
async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;

    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({ quality: [pngQuality, pngQuality] }),
      ],
    });

    // Open dest folder
    shell.openPath(dest);
    // Pass data from Main to Renderer
    mainWindow.webContents.send('image:done');
    // log info
    log.info(files);
  } catch (err) {
    log.error(err);
    console.log(err);
  }
}

// Mac quit settings
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.allowRendererProcessReuse = true;
