/**
 *
 */

import { BreakPointInfo, CommandType } from './DebuggerBase';
import { DebuggerBufferReader, DebuggerBufferWriter } from './DebuggerBuffer';
import { DebuggerCommand } from './DebuggerCommand';

export class CmdBreak extends DebuggerCommand {
    private breakpoints: BreakPointInfo[];

    public constructor(body: string = '', breakpoints: BreakPointInfo[] = []) {
        super(CommandType.KindOfBreak, body);
        this.breakpoints = breakpoints;
        this.version = 1;
    }

    public receive(buffer: DebuggerBufferReader) {
        super.receive(buffer);
        this.breakpoints = buffer.readArrayPtr(BreakPointInfo, this.version);
    }

    public send(buffer: DebuggerBufferWriter) {
        super.send(buffer);
        buffer.writeArrayPtr(this.breakpoints, this.version);
    }
}
