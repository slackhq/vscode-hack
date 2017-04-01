/**
 *
 */

import { BreakPointInfo, CommandType, InterruptType } from './DebuggerBase';
import { DebuggerBufferReader, DebuggerBufferWriter } from './DebuggerBuffer';
import { DebuggerCommand } from './DebuggerCommand';

export class CmdInterrupt extends DebuggerCommand {
    public interrupt: InterruptType;
    private program: string;
    private errorMsg: string;
    private threadId: number;
    private breakPointInfo: BreakPointInfo;
    private matched: BreakPointInfo[];

    public constructor(body: string = '') {
        super(CommandType.KindOfInterrupt, body);
    }

    public receive(buffer: DebuggerBufferReader) {
        super.receive(buffer);
        this.interrupt = buffer.readInt16();
        this.program = buffer.readString();
        this.errorMsg = buffer.readString();
        this.threadId = buffer.readInt64();
        buffer.readBoolean(); // dummy
        const site = buffer.readBoolean();
        if (site) {
            this.breakPointInfo = BreakPointInfo.receiveSpecial(buffer);
        }
        this.matched = buffer.readArrayPtr(BreakPointInfo, this.version);
    }

    public send(buffer: DebuggerBufferWriter) {
        /*super.send(buffer);
        buffer.writeInt16(this.interrupt);
        buffer.writeString(this.program);
        buffer.writeString(this.errorMsg);
        buffer.writeInt64(this.threadId);
        buffer.writeBoolean(false); // dummy
        if (this.breakPointInfo != null) {
            buffer.writeBoolean(true);
            this.breakPointInfo.writeSpecial(buffer);
        }
        buffer.writeArrayPtr(this.matched);*/
        throw new Error('Method not implemented.');
    }
}
