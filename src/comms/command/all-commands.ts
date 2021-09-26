import { SpecificPacketParam } from "../packet-codec";
import { asyncReq } from "./AsyncRequestCommand";
import Command from "./Command";


//  >>>  Control commands, no function, but used in command sender.       <<<  //

// WAIT : no-op used to specify that the request should not expire and data is coming but not here yet.
Command.createCommand("WAIT");



//  >>>  Functional commands, handling or requesting data from the robot. <<<  //

// LOGS : used for fetching custom robot logs.
export const commandLOGS = asyncReq<{
    params:[SpecificPacketParam<"string">,SpecificPacketParam<"int">|undefined]|[],
    return:SpecificPacketParam<"string">[]}
>(Command.createCommand("LOGS"));


//// TODO: add commands