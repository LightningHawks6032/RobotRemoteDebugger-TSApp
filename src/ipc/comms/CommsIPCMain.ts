import { ipcMain } from "electron";
import CommandSender from "../../comms/command/CommandSender";
import { CONNECT_CHANNEL, StateData, STATE_CHANGE_CHANNEL, STATE_GET_CHANNEL, TargetData, TARGET_GET_CHANNEL, TARGET_SET_CHANNEL } from "./CommsIPCCommon";


export class CommsIPCMain {
    static initTo(sender:CommandSender):void {
        ipcMain.on(STATE_GET_CHANNEL,e=>e.returnValue=sender.getConnectionState());
        
        ipcMain.on(TARGET_GET_CHANNEL,e=>e.returnValue=sender.getConnectionTarget());
        ipcMain.on(TARGET_SET_CHANNEL,(e,{ip,port}:TargetData)=>{
            sender.changeConnectionTarget(ip,port);
            e.reply(TARGET_SET_CHANNEL);
        });

        ipcMain.on(CONNECT_CHANNEL,async (e,isConnect)=>{
            const onChange = (v:StateData) => e.reply(STATE_CHANGE_CHANNEL,v);
            sender.onConnStateChange(onChange);
            await (isConnect ? sender.connect() : sender.disconnect());
            // FIXME: wait for public stateChange event to be emitted, or make it bind once.
            sender.offConnStateChange(onChange);
        });
    }
}
