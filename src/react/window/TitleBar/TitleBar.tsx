import { ipcRenderer } from "electron";
import React from "react";
import "./TitleBar.scss";

export type WinBtnWhich = "min"|"max"|"close";

function WinBtn(props:{which:WinBtnWhich}):JSX.Element {
    const {which} = props;
    return <div className={`-wb-${which}`} onClick={e=>onWinBtnClick(which)}>{which}</div>;
}

function onWinBtnClick(which:WinBtnWhich) {
    ipcRenderer.send("winbtn",which);
}

export default function TitleBar(props:Record<string,never>):JSX.Element {
    return (
        <div className="TitleBar">
            <div className="-title">App title thing</div>
            <div className="-buttons">
                <WinBtn which="min"/>
                <WinBtn which="max"/>
                <WinBtn which="close"/>
            </div>
        </div>
    );
}
