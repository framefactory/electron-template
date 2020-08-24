/**
 * template
 *
 * @author Ralph Wiedemeier <ralph@framefactory.io>
 * @copyright (c) 2020 Frame Factory GmbH
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
