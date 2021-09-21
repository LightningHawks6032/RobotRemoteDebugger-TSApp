import * as React from "react";
import * as ReactDOM from "react-dom";
import "./index.scss";
import TitleBar from "./window/TitleBar/TitleBar";

export function render():void {
    ReactDOM.render((
        <>
            <TitleBar />
            <h2>Hello from React!</h2>
        </>
    ), document.getElementById("root"));
}
