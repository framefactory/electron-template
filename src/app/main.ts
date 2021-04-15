/**
 * Electron application template
 * Copyright 2021 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { app, BrowserWindow } from "electron";

////////////////////////////////////////////////////////////////////////////////
// RELOADER FOR MAIN AND RENDERER

try {
    require("electron-reloader")(module, { ignore: "src" });
}
catch (e) {}

////////////////////////////////////////////////////////////////////////////////

function createWindow()
{
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.loadFile("app/pages/built/app.html");
}

app.whenReady().then(createWindow);