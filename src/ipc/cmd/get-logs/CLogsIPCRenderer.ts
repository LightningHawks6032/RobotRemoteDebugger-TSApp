import { ipcRenderer } from "electron";
import { CMD_LOGS_EXEC, CMD_LOGS_RES_N } from "./CLogsIPCCommon";


export class CLogsIPCRenderer {
    static async execLOGS(group?:string,limit?:number):Promise<string[]> {
        const id = Math.random().toString(36).substr(2);
        const p = new Promise<string[]>(res=>
            ipcRenderer.once(CMD_LOGS_RES_N+id,(_,data)=>res(data))
        );
        ipcRenderer.send(CMD_LOGS_EXEC,id,group,limit);
        return await p;
    }
}
