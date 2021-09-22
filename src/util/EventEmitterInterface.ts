export interface EEEntry<EVName,EVArgs extends unknown[] = []> {
    emit(event: EVName, ...args: EVArgs): boolean;

    on                  (event: EVName, listener: (...args: EVArgs) => void): this;
    once                (event: EVName, listener: (...args: EVArgs) => void): this;
    addListener         (event: EVName, listener: (...args: EVArgs) => void): this;
    prependListener     (event: EVName, listener: (...args: EVArgs) => void): this;
    prependOnceListener (event: EVName, listener: (...args: EVArgs) => void): this;
}


/* //trying to get it to auto generate from compact types, not working

import { EventEmitter } from "events";

type EEEntryData = {n:string,a:unknown[]}[];

type EEEntryArrTemplate<K extends EEEntryData[number]> = EEEntry<K["n"],K["a"]>;
type EEInt<K extends EEEntryData> = EEEntryArrTemplate<K[number]>;


const z:EEInt<[{n:"close",a:[string]},{n:"open",a:[number]}]> = new EventEmitter();

z.on("close",v=>{
    //
});

//*/