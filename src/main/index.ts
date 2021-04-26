/**
 * Electron application template
 * Copyright 2021 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import * as path from "path";
import { app, BrowserWindow } from "electron";

////////////////////////////////////////////////////////////////////////////////
// RELOADER FOR MAIN AND RENDERER

try {
    const execFile = process.platform === "win32" ? "electron.cmd" : "electron";
    const execPath = path.join(__dirname, "../../node_modules/.bin", execFile);
    const pagePath = path.join(__dirname, "../renderer");

    require("electron-reload")(pagePath, { electron: execPath });

    console.log(`[main] main reload enabled, electron binary: ${execPath}`);
    console.log(`[main] page reload enabled, watching ${pagePath}`);
}
catch (e) {
    console.warn("[main] reload disabled", e);
}

////////////////////////////////////////////////////////////////////////////////

function createWindow()
{
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    win.loadFile("../renderer/index.html");
}

app.whenReady().then(createWindow);