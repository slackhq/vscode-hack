/**
 * Contains implementation of a subset of HHVM debugger command, used for communication between a
 * debugger client and remote server.
 */

import { CommandType } from './DebuggerBase';
import { DebuggerBufferReader, DebuggerBufferWriter, IDebuggerBufferReadable } from './DebuggerBuffer';

export abstract class DebuggerCommand implements IDebuggerBufferReadable {
    public cmdType: CommandType;
    private body: string;
    protected version: number;

    public constructor(cmdType: CommandType, body: string) {
        this.cmdType = cmdType;
        this.body = body;
    }

    public receive(buffer: DebuggerBufferReader) {
        this.body = buffer.readString();
        this.version = buffer.readInt32();
    }

    public send(buffer: DebuggerBufferWriter) {
        buffer.writeInt32(this.cmdType);
        buffer.writeString(''); // unused class
        buffer.writeString(this.body);
        buffer.writeInt32(this.version);
    }
}
