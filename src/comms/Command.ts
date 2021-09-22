import { Packet } from "./packet-codec";

export const commandNameFormat = /^[A-Z_]{4}$/;

type ReqHandler = (packet:Packet)=>void;
type ResHandler = (pReq:Packet,pRes:Packet[])=>void;

class Command {
    private static readonly commands: Command[] = [];

    private reqHandler?:ReqHandler;
    private resHandler?:ResHandler;

    private constructor(readonly id:string) {
        if (!commandNameFormat.test(id))
            throw new Error(`Command id was not in format /${commandNameFormat.source}/`);

    }

    private alreadyHasHandler() { throw new Error("Attempted to double-assign handlers to a command.")}
    onRequest (callback:ReqHandler):this { if (this.reqHandler) this.alreadyHasHandler(); else this.reqHandler=callback; return this }
    onResponse(callback:ResHandler):this { if (this.resHandler) this.alreadyHasHandler(); else this.resHandler=callback; return this }
    
    handleRequest(packet:Packet):void { if (this.reqHandler) this.reqHandler(packet); }
    handleResponse(pReq:Packet,pRes:Packet[]):void { if (this.resHandler) this.resHandler(pReq,pRes); }


    /** Get a command by it's command id. */
    static findCommand(cmdId:string):Command|null {
        return this.commands.find(({id})=>cmdId===id);
    }
    /** Create and add a new command. */
    static createCommand(id:string):Command {
        const cmd = new Command(id);
        Command.commands.push(cmd);
        return cmd;
    }
}

export default Command;
