import React, { ReactNode } from "react";
import "./.scss";
import { ConnectionState } from "../../comms/Connection";
import { CommsIPCRenderer as CommsIPC } from "../../ipc/comms/CommsIPCRenderer";
import { StateData } from "../../ipc/comms/CommsIPCCommon";

export default class ConnectionManager extends React.Component<unknown,{ip:string,port:string,connState:ConnectionState}> {

    constructor(props:ConnectionManager["props"]) {
        super(props);
        const {ip,port} = CommsIPC.getTarget(), connState = CommsIPC.getState();
        this.state = {ip,port:port.toString(),connState};
    }

    onChangeIP  :React.ChangeEventHandler<HTMLInputElement> = e=>this.setState({ip:  e.target.value});
    onChangePort:React.ChangeEventHandler<HTMLInputElement> = e=>this.setState({port:e.target.value});

    componentDidMount():void {
        CommsIPC.stateChangeHandlers.add(this.onStateChanged);
    }
    componentWillUnmount():void {
        CommsIPC.stateChangeHandlers.delete(this.onStateChanged);
    }

    onStateChanged:(v:StateData)=>void = connState=>{console.log(connState);this.setState({connState})};

    doSync:React.MouseEventHandler = async e=>{
        const ip = this.state.ip.trim();
        const port = parseInt(this.state.port);        
        await CommsIPC.setTarget({ip,port});        
        this.forceUpdate();
    };

    doConnect:React.MouseEventHandler = async e=>this.setConnect(true);
    doDisconnect:React.MouseEventHandler = async e=>this.setConnect(false);
    setConnect(v:boolean):void {
        CommsIPC.setConnected(v);
    }

    render():ReactNode {
        const {ip,port,connState} = this.state;
        
        const ipFormatted = ip.trim();
        const portNum = parseInt(port);
        const {ip:currentIp,port:currentPort} = CommsIPC.getTarget();

        const needsTargetSync = isFinite(portNum) && portNum >= 0 && portNum < 0x10000 && (ipFormatted!==currentIp || portNum !== currentPort);

        return (
            <div className="ConnectionPanel">
                <div><label>Connected:</label><span>{connState}</span></div>
                <div><label>IP:</label><input value={ip} onChange={this.onChangeIP}/></div>
                <div><label>Port:</label><input value={port} onChange={this.onChangePort}/></div>
                <div><button disabled={!needsTargetSync} onClick={this.doSync}>Sync IP/Port</button></div>
                <div>{
                    (connState === "CLOSED" && (<button onClick={this.doConnect}>Connect</button>)) ||
                    (connState === "OPEN" && (<button onClick={this.doDisconnect}>Disonnect</button>)) ||
                    (<span>wait for (dis)connection</span>)
                }</div>
            </div>
        );
    }
}