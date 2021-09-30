import { ipcMain } from "electron";
import { commandLOGS } from "../../../comms/command/all-commands";
import CommandSender from "../../../comms/command/CommandSender";
import { CMD_LOGS_EXEC, CMD_LOGS_RES_N } from "./CLogsIPCCommon";


export class CLogsIPCMain {
    static initTo(sender:CommandSender):void {
        ipcMain.on(CMD_LOGS_EXEC,async(e,resChannel:string,group?:string,limit?:number)=>{
            const data = await commandLOGS.request(
                sender,
                group&&{type:"string",data:group},
                limit&&{type:"int",data:limit}
            );
            e.reply(CMD_LOGS_RES_N+resChannel,data.map(v=>v.data));
        });
    }
}