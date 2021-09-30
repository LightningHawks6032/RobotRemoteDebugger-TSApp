import React, { ReactNode } from "react";
import { CLogsIPCRenderer } from "../../ipc/cmd/get-logs/CLogsIPCRenderer";

export default class LogsPanel extends React.Component<unknown,{logs:{[key:string]:false|string[]}}> {
    constructor(props:LogsPanel["props"]){
        super(props);
        this.state = {logs:{}};
    }

    async updateLogGroups():Promise<void> {
        console.log("---UGroup");
        
        const groups = await CLogsIPCRenderer.execLOGS();
        console.log(groups);

        const obj:{[key:string]:false|string[]} = {};
        for (const group of groups)
            obj[group] = this.state.logs[group] ?? false;
        this.setState({logs:obj});
    }

    async updateLog(group:string):Promise<void> {
        console.log("---ULog");
        if (!(group in this.state.logs))
            return;
        const logs = await CLogsIPCRenderer.execLOGS(group);
        console.log(logs);
        this.state.logs[group] = logs;
    }

    render():ReactNode {
        return (
            <div>
                <button onClick={e=>this.updateLogGroups()}>ulg</button>
                <button onClick={e=>this.updateLog(Object.keys(this.state.logs)[0])}>gL</button>
                {JSON.stringify(this.state.logs)}
            </div>
        );
    }
}