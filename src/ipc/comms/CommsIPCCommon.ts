export type TargetData = {ip:string,port:number};
export type StateData = "CLOSED"|"OPENING"|"OPEN"|"CLOSING";

export const TARGET_GET_CHANNEL = "comms-target-get";
export const TARGET_SET_CHANNEL = "comms-target-set";

export const STATE_GET_CHANNEL = "comms-state-get";
export const STATE_CHANGE_CHANNEL = "comms-state-changed";

export const CONNECT_CHANNEL = "comms-connect";

