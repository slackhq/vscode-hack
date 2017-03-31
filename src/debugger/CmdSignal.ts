/**
 *
 */

import { CommandType } from './DebuggerBase';
import { DebuggerBufferReader, DebuggerBufferWriter } from './DebuggerBuffer';
import { DebuggerCommand } from './DebuggerCommand';

export enum Signal {
    SignalNone,
    SignalBreak
}

export class CmdSignal extends DebuggerCommand {
    public signal: Signal;

    public constructor(body: string = null, signal: Signal = Signal.SignalNone) {
        super(CommandType.KindOfSignal, body);
        this.signal = signal;
    }

    public receive(buffer: DebuggerBufferReader) {
        super.receive(buffer);
        this.signal = buffer.readInt32();
    }

    public send(buffer: DebuggerBufferWriter) {
        super.send(buffer);
        buffer.writeInt32(this.signal);
    }
}
