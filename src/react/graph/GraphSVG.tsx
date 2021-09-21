import React, { ReactNode } from "react";
import "./GraphSVG.scss";

export type LineColor = "CL0"|"CL1"|"CL2";
export type Line = {color:LineColor, positions:[number,number][], width?:number, close?:boolean};

export default class GraphSVG extends React.Component<{lines:Line[]}> {

    static buildPathData(line:Line):string {
        const {positions,close} = line;
        let txt = "M ";
        txt += positions.map(v=>v.join(" ")).join(" L ");
        if (close) txt += " z";
        return txt;
    }

    render():ReactNode {
        const { lines } = this.props;
        return (
            <svg width="300" height="200" className="GraphSVG">{
                lines.map((v,i)=>(<>
                    <path key={i} d={GraphSVG.buildPathData(v)}
                        style={{fillOpacity:0, stroke:`var(--_${v.color})`, strokeWidth: v.width??2}} />
                </>))
            }</svg>

        );
    }
}