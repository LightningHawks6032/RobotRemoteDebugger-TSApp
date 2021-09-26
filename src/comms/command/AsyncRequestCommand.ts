import { Packet, PacketParam } from "../packet-codec";
import Command, { ResHandler } from "./Command";
import CommandSender from "./CommandSender";


type TB = {params:PacketParam[],return:PacketParam[]};

type P<T extends TB> = T["params"];
type R<T extends TB> = T["return"];

/** Asynchronous wrapper class for data request commands. */
export default class AsyncRequestCommand<T extends TB> {
    private readonly requestPromiseResolutions:{[key:number]:(a:[Packet,Packet[]])=>void} = {};

    private command:Command;
    constructor(command:Command) {
        this.command = command;
        command.onResponse(this.handleRes);
    }

    handleRes:ResHandler = (req,ress)=>this.requestPromiseResolutions[req.requestId]([req,ress]);

    public async request(sender:CommandSender, ...params:P<T>):Promise<R<T>> {
        const reqId = sender.makeRequest(this.command,[...params]);
        const [,[res]] = await new Promise<[Packet,Packet[]]>(res=>this.requestPromiseResolutions[reqId]=res);
        return [...res.params];
    }
}

/** Shorthand for `new AsyncRequestCommand<T>(command:Command)`. */
export function asyncReq<T extends TB>(command:Command):AsyncRequestCommand<T> {
    return new AsyncRequestCommand<T>(command);
}
