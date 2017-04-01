/**
 *
 */

import { CommandType } from './DebuggerBase';
import { DebuggerBufferReader, DebuggerBufferWriter } from './DebuggerBuffer';
import { DebuggerCommand } from './DebuggerCommand';

export class CmdFlowControl extends DebuggerCommand {
    public constructor(
        commandType: CommandType,
        body: string,
        protected count: number,
        protected smallStep: boolean) {
        super(commandType, body);
    }

    public receive(buffer: DebuggerBufferReader) {
        super.receive(buffer);
        this.count = buffer.readInt16();
        this.smallStep = buffer.readBoolean();
    }

    public send(buffer: DebuggerBufferWriter) {
        super.send(buffer);
        buffer.writeInt16(this.count);
        buffer.writeBoolean(this.smallStep);
    }
}
