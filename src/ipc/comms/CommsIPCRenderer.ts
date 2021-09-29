import { ipcRenderer } from "electron";
import { CONNECT_CHANNEL, StateData, STATE_CHANGE_CHANNEL, STATE_GET_CHANNEL, TargetData, TARGET_GET_CHANNEL, TARGET_SET_CHANNEL } from "./CommsIPCCommon";


export class CommsIPCRenderer {
    static getTarget():TargetData {
        return ipcRenderer.sendSync(TARGET_GET_CHANNEL);
    }
    static getState():StateData {
        return ipcRenderer.sendSync(STATE_GET_CHANNEL);
    }
    static async setTarget(v:TargetData):Promise<void> {
        ipcRenderer.send(TARGET_SET_CHANNEL,v);
        await new Promise<void>(res=>ipcRenderer.once(TARGET_SET_CHANNEL,_=>res()));
    }
    static setConnected(v:boolean):void {
        ipcRenderer.send(CONNECT_CHANNEL,v);
    }

    public static readonly stateChangeHandlers:Set<(v:StateData)=>void> = new Set();

    // Static init
    static {
        ipcRenderer.on(STATE_CHANGE_CHANNEL,(e,v:StateData)=>{
            for(const fn of CommsIPCRenderer.stateChangeHandlers)
                fn(v);
        });
    }
}
