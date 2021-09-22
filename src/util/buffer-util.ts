/** Read one character out of a buffer in ascii encoding. */
export function readChar(buf:Buffer,off:number):string {
    return buf.slice(off,off+1).toString("ascii");
}
