import * as React from "react";
import * as ReactDOM from "react-dom";
import ConnectionManager from "./connection/ConnectionPanel";
import "./index.scss";
import LogsPanel from "./logspanel/LogsPanel";
import TitleBar from "./window/TitleBar/TitleBar";

export function render():void {
    ReactDOM.render((
        <>
            <TitleBar />
            <div className="-connInfo">
                <ConnectionManager/>
            </div>
            <div className="-mainPanel">
                <LogsPanel/>
            </div>
        </>
    ), document.getElementById("root")); // TODO page switcher
}

document.body.classList.add("theme-dark");
