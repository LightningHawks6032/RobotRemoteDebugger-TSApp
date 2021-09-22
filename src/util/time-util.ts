/** Number of milliseconds since `time` (negative if `time` > `now`). */
export function timeSince(time:number, now?:number):number {
    return (now??Date.now()) - time;
}