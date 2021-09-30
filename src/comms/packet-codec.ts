/*/
# Packet format:    *ALWAYS USE BIG-ENDIAN

    command name format: UPPER_CASE, LEN=4;
    param format: `f{encoded float}`|`s{int for length}HelloWorld`|`i{encoded int}`; {f:float,s:string,i:integer}
    id format: encoded random int not 0

    Requests:
        `>{command}{id|0}{nParams}{param}{param}`

    Response:
        `<{command}{id}{nParams}{param}{param}`
/*/

import BufferCodec from "./BufferEncoder";
import { readChar } from "../util/buffer-util";
import Command from "./command/Command";


/** Map from long param type names to single char names. */
const paramTypeChars:{[key in PacketParam["type"]]:string} = {
    float:"f", int:"i", string:"s"
};
/** Map from long packet type names to single char names. */
const packetTypeChars:{[key in Packet["type"]]:string} = {
    request:">", response:"<"
};

/** Map from single char names to long param type names. */
const paramTypeCharsInv:{[key:string]:PacketParam["type"]|undefined} = Object.fromEntries(Object.entries(paramTypeChars).map(([a,b])=>[b,a])) as never;
/** Map from single char names to long packet type names. */
const packetTypeCharsInv:{[key:string]:Packet["type"]|undefined} = Object.fromEntries(Object.entries(packetTypeChars).map(([a,b])=>[b,a])) as never;


/** JSON representation of a parameter sent in packets. */
export type PacketParam = Readonly<{type:"int",data:number}|{type:"float",data:number}|{type:"string",data:string}>;

/** PacketParam except it must be one of the types instead of any. (doen't work right if using more than one though, so don't) */
export type SpecificPacketParam<T extends "int"|"float"|"string"> = Readonly<{type:T,data:{int:number,float:number,string:string}[T]}>;
/** alias for `SpecificPacketParam` */ 
export type SPacketParam<T extends "int"|"float"|"string"> = SpecificPacketParam<T>;

/** JSON representation of packets sent to/from the robot. */
export type Packet = Readonly<{
    /** If this is a request for data or action or a response to it.*/
    type: "request"|"response";
    /** The command the packet is carrying. */
    command: Command;
    /** Id of the request for keeping track of responses to requests */
    requestId: number;
    params: readonly PacketParam[];
}>;


/** Utility for en/decoding PacketParams */
export const PacketParamCodec: BufferCodec<PacketParam> = {
    encode(data:PacketParam):Buffer {
        
        const headerBuf:Buffer = Buffer.alloc(2); 
        let dataBuf:Buffer;

        // Write "i","f", or "s" to the start to mark the data type. 
        headerBuf.write(paramTypeChars[data.type],"ascii");
        
        // Write the data for the param in the correct format.
        switch(data.type) {
        case "float":  dataBuf = Buffer.alloc(4); dataBuf.writeFloatBE(data.data); break;
        case "int":    dataBuf = Buffer.alloc(4); dataBuf.writeInt32BE(data.data); break;
        case "string": {
            // Encode the string and then put its byte length in a buffer.
            const strBuf = Buffer.from(data.data,"utf-8");
            const lenBuf = Buffer.alloc(4); lenBuf.writeInt32BE(strBuf.byteLength);
            dataBuf = Buffer.concat([lenBuf,strBuf]);
        } break;
        }

        // Return a combined buffer with all the data.
        return Buffer.concat([headerBuf,dataBuf]);
    },

    decode(buf:Buffer,_off:number):[number, PacketParam] {
        // Copy off so it can be modified.
        let off = _off;
        // Get the type indication character from the buffer.
        const typeChar = readChar(buf,off), type = paramTypeCharsInv[typeChar];
        off += 1;
        // Depending on the type
        switch(type) {
        case "float":  return [off+4,{type,data:buf.readFloatBE(off)}];
        case "int":    return [off+4,{type,data:buf.readInt32BE(off)}];
        case "string": {
            const strLen = buf.readInt32BE(off); off += 4;
            return [off+strLen, {type,data:buf.slice(off,off+strLen).toString("utf-8")}];
        }
        // Type did not match, throw error.
        default: 
            throw new Error(`could not decode param, type "${typeChar}" was not a valid param type`);
        }
    }
};

/** Utility for en/decoding Packets. */
export const PacketCodec: BufferCodec<Packet> = {
    encode(data:Packet):Buffer {
        // Only use defined parameters.
        const params = data.params.filter(Boolean);
        // Encode all the parts of the packet.
        const typeBuf = Buffer.from(data.type==="request"?">":"<","ascii"),
            cmdBuf = Buffer.from(data.command.id),
            idBuf = Buffer.alloc(4),
            nParamsBuf = Buffer.alloc(4),
            paramsBuf = params.map(v=>PacketParamCodec.encode(v));
        idBuf.writeInt32BE(data.requestId);
        nParamsBuf.writeInt32BE(params.length);
        // Concatonate the sections and return.
        return Buffer.concat([typeBuf,cmdBuf,idBuf,nParamsBuf,...paramsBuf]);
    },

    decode(buf:Buffer,off_:number):[number,Packet] {
        // Copy off so it can be modified.
        let off = off_;
        // Is requst or response.
        const typeChar = readChar(buf,off), type = packetTypeCharsInv[typeChar];
        if (!type) throw new Error(`could not decode param, type "${typeChar}" was not a valid param type`);
        off += 1;
        // Command.
        const cmdId = buf.slice(off,off+4).toString("ascii"), command = Command.findCommand(cmdId);
        if (!command) throw new Error(`could not decode param, command "${cmdId}" was not found`);
        off += 4;
        // Request id.
        const requestId = buf.readInt32BE(off);
        off += 4;
        // Number of params in this packet.
        const nParams = buf.readInt32BE(off), params:PacketParam[] = [];
        off += 4;
        // Load in params.
        for (let i = 0; i < nParams; i++) {
            const [newOff,data] = PacketParamCodec.decode(buf,off);
            off = newOff;
            params.push(data);
        }
        // Return the data.
        return [off,{type,command,params,requestId}];
    }
    
};

/** Utility function to check if the packet data is all there. */
export function isPacketFragment(buf:Buffer,off_:number):boolean {
    let off = off_;
    if (buf.byteLength-off < 13) return true;
    off += 13;
    const nPackets = buf.readInt32BE(off-4);
    for (let i = 0; i < nPackets; i++) {
        if (buf.byteLength-off < 8) return true;
        const typeChar = readChar(buf,off), type = paramTypeCharsInv[typeChar];
        off += 8;
        if (type === "string") {
            const strLen = buf.readInt32BE(off-4);
            if (buf.byteLength-off < strLen) return true;
            off += strLen;
        }
    }
    return false;
}
