import { timeSince as millisSince } from "../util/time-util";
import Command from "./Command";
import Connection from "./Connection";
import { Packet, PacketParam } from "./packet-codec";
import "./all-commands";

export type CommandSenderConfig = {reqMaxAge:number,pruneInterval:number,sendDelay:number};
const DEFAULT_CMDSENDER_CONFIG:CommandSenderConfig = {reqMaxAge:10000,pruneInterval:5000,sendDelay:10};

/** Class which handles sending and receiving of packets in terms of commands, requests, and responses. */
export default class CommandSender {
    private readonly config:Readonly<CommandSenderConfig>;
    private readonly connection:Connection;
    private readonly sentCommandsById:{[key:string]:{lastUpdated:number,request:Packet,responses:Packet[]}} = {};
    private sentCommandsLastPruned = Date.now();

    private packetsToSend:Packet[] = [];
    private sendTimeoutId?:NodeJS.Timeout;

    constructor(ip:string,port:number,config?:Partial<CommandSenderConfig>) {
        this.connection = new Connection(ip,port);
        this.connection.event.on("packet",this.handlePacket.bind(this));

        this.config = {...(config ?? {}), ...DEFAULT_CMDSENDER_CONFIG}; Object.freeze(this.config);
    }


    /** Change the ip and port the connection is attempting to reach. */
    async changeConnectionTarget(ip:string,port:number):Promise<void> { await this.connection.changeTarget(ip,port) }
    /** Connect to robot. (Or reload if already connected. */
    async connect():Promise<void> { await this.connection.connect() }
    /** Disconnect from robot. */
    async disconnect():Promise<void> { await this.connection.disconnect() }
    

    /** Respond to a packet the robot sent and queue the response for sending. */
    respondTo(packet:Packet, command:Command, params:PacketParam[], immediate = false):void {
        if (packet.type === "response") throw new Error("Cannot respond to a response");
        const {requestId} = packet;
        const resPacket:Packet = {requestId,command,params,type:"response"};
        this.sendOrEnqueue(immediate,resPacket);
    }
    /** Make a request to the robot and queue the packet for sending. */
    makeRequest(command:Command, params:PacketParam[], immediate = false):void {
        const requestId = Math.floor(0x100000000*Math.random())-0x80000000;
        const reqPacket:Packet = {requestId,params,command,type:"request"};
        this.sendOrEnqueue(immediate, reqPacket);

        this.sentCommandsById[requestId] = {lastUpdated:Date.now(),request:reqPacket,responses:[]};
    }

    /** Handle a group of incoming packets. Bound to `this.connection.event.on("packets",(packets:PacketData[])=>void)` */
    private async handlePacket(packets:Packet[]):Promise<void> {
        this.pruneIfNeccessary();
        // Loop through all packets, handling them one at a time.
        for (const packet of packets) {
            if (packet.type === "request")
                // If its a request, simply handle it.
                packet.command.handleRequest(packet);
            else if (packet.type === "response") {
                // If its a response, find the request it's associated with.
                const { requestId } = packet;
                const ent = this.sentCommandsById[requestId];
                // If the entry is missing, throw an error. (It has expired or never existed to begin with).
                if (!ent) throw new Error("Received response packet to missing or expired request.");
                // Update its `lastUpdated` and add this response to `responses`
                ent.lastUpdated = Date.now();
                // Switch to detect and handle Control Commands.
                switch (packet.command.id) {
                case "WAIT": // `WAIT` command, no-op, a real packet is coming soon, prevents request expiry.
                    break;
                default: // Functional commands
                    ent.responses.push(packet);
                    // Then handle with the collected info.
                    packet.command.handleResponse(ent.request,ent.responses);
                    break;
                }
            }
        }
    }

    /** Send a packet or schedule it to be sent with others. */
    private sendOrEnqueue(immediate:boolean, ...packets:Packet[]):void {
        if (immediate)
            this.connection.sendPackets(...packets);
        else {
            this.packetsToSend.push();
            this.scheduleSend();
        }
    }
    /** Schedule the queued packets to be sent. */
    private scheduleSend():void {
        if (this.sendTimeoutId === undefined)
            this.sendTimeoutId = setTimeout(this.send,this.config.sendDelay);
    }
    /** Send the queued packets. (and clear the timeout in case it was called by an external system) */
    send():void {
        this.connection.sendPackets(...this.packetsToSend.splice(0));
        clearTimeout(this.sendTimeoutId);
        delete this.sendTimeoutId;
    }

    
    /** If it has been more than `pruneInterval` millis since the sent commands were pruned, call `pruneSentCommands` */
    private pruneIfNeccessary():void {
        if (millisSince(this.sentCommandsLastPruned) > this.config.pruneInterval)
            this.pruneSentCommands();
    }

    /** Remove entries from `sentCommandsById` if it was last updated more than `reqMaxAge` milliseconds ago. */
    private pruneSentCommands():void {
        const now = Date.now();
        this.sentCommandsLastPruned = now;
        
        for (const id of Object.keys(this.sentCommandsById)) {
            if (millisSince(this.sentCommandsById[id].lastUpdated, now) > this.config.reqMaxAge)
                delete this.sentCommandsById[id];
        }
    }
}
