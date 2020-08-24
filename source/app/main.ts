/**
 * template
 *
 * @author Ralph Wiedemeier <ralph@framefactory.io>
 * @copyright (c) 2020 Frame Factory GmbH
 */

import { app, BrowserWindow } from "electron";

////////////////////////////////////////////////////////////////////////////////
// HOT MODULE RELOADING FOR MAIN AND RENDERER

try {
    require("electron-reloader")(module);
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

    win.loadFile("app/pages/built/app.dev.html");
}

app.whenReady().then(createWindow);