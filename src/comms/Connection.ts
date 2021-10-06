import { EventEmitter } from "events";
import net from "net";
import { EEEntry } from "../util/EventEmitterInterface";
import { isPacketFragment, Packet, PacketCodec } from "./packet-codec";

/** Openness state of the connection. */
export type ConnectionState = "CLOSED"|"OPENING"|"OPEN"|"CLOSING";

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
    // Custom events usable by external systems
    EEEntry<"packet",[Packet[]]> &
    EEEntry<"stateChange",[ConnectionState]>
) & EventEmitter;

type ConnectionEventEmitterPrivate = ConnectionEventEmitterCommon & EventEmitter;

/** Handle the connection, disconnection, and data from the port.  */
export default class Connection {
    /** The current socket, or undefined if closed. */
    private current?: net.Socket;
    /** Openness state of the connection. */
    private state:ConnectionState = "CLOSED";
    /** Openness state of the connection. */
    public getState():ConnectionState { return this.state }
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
            this.emitStateChange();
        });
        this.privateEvent.on("error", e => {  console.error(e) });
        this.privateEvent.on("connect", ()=>{
            this.state = "OPEN";
            this.emitStateChange();
        });
        this.event.on("error",e=>void(0));
    }


    /** Emit the stateChange event to the public EventEmitter. */
    private emitStateChange() {
        this.event.emit("stateChange",this.state);
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
        this.partialData = Buffer.from([]);
        // Forward all events on the socket to this connection object's EventEmitter.
        for (const eventName of allEvents)
            this.current.on(eventName, this.emitEvent.bind(this,eventName));
    }
    /** Emit an event to `this.privateEvent` and `this.event`. */
    private emitEvent(eventName:string, ...args:never[]) {
        this.privateEvent.emit(eventName as never, ...args as []);
        if (eventName !== "error")
            this.event   .emit(eventName as never, ...args as []);
    }
    

    /** Calls end on the current socket. */
    async disconnect():Promise<void> {
        if (this.state === "CLOSED" || this.state === "CLOSING") {
            console.warn("disconnect was called on already disconnected socket, nothing changed");
            return;
        }
        this.state = "CLOSING";
        this.emitStateChange();
        await new Promise<void>(res=>this.current.end(res));
    }
    /** Connect / reconnect to the remote side. */
    async connect():Promise<void> {
        if (this.state === "OPEN" || this.state === "OPENING")
            await this.disconnect();
        else if (this.state === "CLOSING")
            throw new Error("Cannot open a connection while it is attempting to close, wait for it to finish.");
        this.state = "OPENING";
        this.emitStateChange();
        
        this.setCurrent(new net.Socket());
        await new Promise<void>(res=>this.current.connect(this._port,this._ip,res));
    }
    /** Switch the IP and port of the connection, will close and reopen if connection is open. */
    async changeTarget(ip:string,port:number):Promise<void> {
        this._ip = ip; this._port = port;
        if (this.state === "OPEN" || this.state === "OPENING")
            this.connect();
    }
    /** Get the current ip and port of this connection. */
    getTarget():{ip:string,port:number} { return {ip:this._ip,port:this._port} }

    private partialData:Buffer = Buffer.from([]);
    /** Callback bound to `event.on("data",(data:Buffer)=>void)`, decodes packets and forwards them back to the event system. */
    private onData(buffer_:Buffer):void {
        const buffer = Buffer.concat([this.partialData,buffer_]);
        console.log("RECEIVING:",buffer_,"Reconstructed:",buffer);
        
        const packets:Packet[] = [];
        // Keep reading packets until there is no data left.
        for (let off = 0; off < buffer.length;) {
            if (isPacketFragment(buffer,off)) {
                console.log("Receive has fragment:",buffer);
                this.partialData = buffer.slice(off);
                break;
            }
            const [newOff,data] = PacketCodec.decode(buffer,off);
            off = newOff; packets.push(data);
            this.partialData = buffer.slice(off);
            console.log("Packet existed, refragmenting:",this.partialData);
        }
        // Emit a packets event to the connection EventEmitter.
        this.event.emit("packet",packets);
    }
    /** Send command packets to the robot. */
    async sendPackets(...packet: Packet[]):Promise<void> {
        this.assertConnected();
        // Encode, concatonate and send the packets.
        const data = Buffer.concat(packet.map(PacketCodec.encode));
        console.log("SENDING: ",data);
        this.write(data);
    }
}
