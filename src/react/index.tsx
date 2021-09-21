import * as React from "react";
import * as ReactDOM from "react-dom";
import "./index.scss";

export function render():void {
    ReactDOM.render(<h2>Hello from React!</h2>, document.getElementById("root"));
}
