/**
 * Electron application template
 * Copyright 2021 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { LitElement, html, customElement } from "lit-element";

@customElement("ff-application")
export default class Application extends LitElement
{
    render()
    {
        return html`<h1>Electron App Template</h1>
            <p>Hello, World!</p>`;
    }
}
