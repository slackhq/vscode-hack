/**
 *
 */

import { CommandType, SandboxInfo } from './DebuggerBase';
import { DebuggerBufferReader, DebuggerBufferWriter } from './DebuggerBuffer';
import { DebuggerCommand } from './DebuggerCommand';

export class CmdMachine extends DebuggerCommand {
    public constructor(body: string = '', private sandboxes: SandboxInfo[] = [], private force: boolean = false, public succeed: boolean = false) {
        super(CommandType.KindOfMachine, body);
    }

    public receive(buffer: DebuggerBufferReader) {
        super.receive(buffer);
        this.sandboxes = buffer.readArray(SandboxInfo);
        buffer.readString(); // unused rpc config
        this.force = buffer.readBoolean();
        this.succeed = buffer.readBoolean();
    }

    public send(buffer: DebuggerBufferWriter) {
        super.send(buffer);
        buffer.writeArray(this.sandboxes);
        buffer.writeString(''); // unused rpc config
        buffer.writeBoolean(this.force);
        buffer.writeBoolean(this.succeed);
    }
}
