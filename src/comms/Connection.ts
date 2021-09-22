import { EventEmitter } from "events";
import net from "net";
import { EEEntry } from "../util/EventEmitterInterface";
import { Packet, PacketCodec } from "./packet-codec";

/** Openness state of the connection. */
type ConnectionState = "CLOSED"|"OPENING"|"OPEN"|"CLOSING";

const allEvents = ["connect","ready","timeout","drain","end","close","data","error","lookup"];
type ConnectionEventEmitterCommon = (
    EEEntry<"connect"> & 
    EEEntry<"ready"  > &
    EEEntry<"timeout"> &
    EEEntry<"end"    > &
    EEEntry<"close", [boolean]> &
    EEEntry<"data",  [Buffer ]> &
    EEEntry<"error", [Error  ]> // note: I dropped some events which were clunky and or unlikely to be used.
);
type ConnectionEventEmitter = (ConnectionEventEmitterCommon &
    EEEntry<"packet",[Packet[]]> // Custom event usable by external systems
);

type ConnectionEventEmitterPrivate = ConnectionEventEmitterCommon;

/** Handle the connection, disconnection, and data from the port.  */
export default class Connection {
    /** The current socket, or undefined if closed. */
    private current?: net.Socket;
    /** Openness state of the connection. */
    private state:ConnectionState = "CLOSED";
    /** An EventEmitter used to handle events from the current socket outside the connection object. */
    readonly event:ConnectionEventEmitter = new EventEmitter();
    /** Like event, but only inside the connection object. */
    private readonly privateEvent:ConnectionEventEmitterPrivate = new EventEmitter();

    /** Construct a new Connection.
     * @param _ip The robot's ip.
     * @param _port The remote debugger's port on the robot. */
    constructor(private _ip:string, private _port:number) {
        // Add event handlers.
        this.privateEvent.on("data", this.onData.bind(this));
        this.privateEvent.on("close", wasError => {
            this.state = "CLOSED";
            delete this.current;
        });
        this.privateEvent.on("error", e => { throw e });
    }


    /** Throw an error if the socket is disconnected. */
    private assertConnected():net.Socket {
        if (this.state === "OPEN") return this.current;
        else throw new Error("Attempted to interact with closed connection, reopen it before you try anything.");
    }

    /** Async write a buffer to the socket. */
    private write(buf:Buffer):Promise<void> {
        return new Promise((res,rej)=>this.current?.write(new Uint8Array(buf.values()),err=>err?rej(err):res()));
    }
    /** Read from the socket as a buffer. */
    private read(len?:number):Buffer|null {
        this.current.setEncoding(null);
        return this.current?.read(len) ?? null;
    }
    /** Set the current socket. */
    private setCurrent(socket:net.Socket):void {
        this.current = socket;
        // Forward all events on the socket to this connection object's EventEmitter.
        for (const eventName of allEvents)
            this.current.on(eventName, this.emitEvent.bind(this,eventName));
    }
    /** Emit an event to `this.privateEvent` and `this.event`. */
    private emitEvent(eventName:string,args:never[]) {
        this.privateEvent.emit(eventName as never, ...args as []);
        this.event       .emit(eventName as never, ...args as []);
    }
    

    /** Calls end on the current socket. */
    async disconnect():Promise<void> {
        if (this.state === "CLOSED" || this.state === "CLOSING") {
            console.warn("disconnect was called on already disconnected socket, nothing changed");
            return;
        }
        this.state = "CLOSING";
        await new Promise<void>(res=>this.current.end(res));
        this.state = "CLOSED";
        delete this.current;
    }
    /** Connect / reconnect to the remote side. */
    async connect():Promise<void> {
        if (this.state === "OPEN" || this.state === "OPENING")
            await this.disconnect();
        else if (this.state === "CLOSING")
            throw new Error("Cannot open a connection while it is attempting to close, wait for it to finish.");
        this.state = "OPENING";
        await new Promise<void>(res=>this.setCurrent(net.connect(this._port,this._ip,res)));
        this.state = "OPEN";
    }
    /** Switch the IP and port of the connection, will close and reopen if connection is open. */
    async changeTarget(ip:string,port:number):Promise<void> {
        this._ip = ip; this._port = port;
        if (this.state === "OPEN" || this.state === "OPENING")
            this.connect();
    }

    /** Callback bound to `event.on("data",(data:Buffer)=>void)`, decodes packets and forwards them back to the event system. */
    private onData(buffer:Buffer):void {
        const packets:Packet[] = [];
        // Keep reading packets until there is no data left.
        for (let off = 0; off < buffer.length;) {
            const [newOff,data] = PacketCodec.decode(buffer,off);
            off = newOff; packets.push(data);
        }
        // Emit a packets event to the connection EventEmitter.
        this.event.emit("packet",packets);
    }
    /** Send command packets to the robot. */
    async sendPackets(...packet: Packet[]):Promise<void> {
        this.assertConnected();
        // Encode, concatonate and send the packets.
        const data = Buffer.concat(packet.map(PacketCodec.encode));
        this.write(data);
    }
}
