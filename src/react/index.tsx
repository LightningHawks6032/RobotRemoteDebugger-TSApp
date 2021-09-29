import * as React from "react";
import * as ReactDOM from "react-dom";
import ConnectionManager from "./connection/ConnectionPanel";
import "./index.scss";
import TitleBar from "./window/TitleBar/TitleBar";

export function render():void {
    ReactDOM.render((
        <>
            <TitleBar />
            <ConnectionManager/>
        </>
    ), document.getElementById("root"));
}
