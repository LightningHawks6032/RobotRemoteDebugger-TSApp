export default interface BufferEncoder<T> {
    /** Encode T into a buffer for sending. */
    encode(data:T):Buffer;

    /** Decode T from a buffer and return its json representation. 
     * @returns [{new buffer offset}, {the json data}] */
    decode(buf:Buffer,off:number):[number,T];
}
