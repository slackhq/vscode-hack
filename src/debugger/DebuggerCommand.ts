/**
 * Contains implementation of a subset of HHVM debugger command, used for communication between a
 * debugger client and remote server.
 */

import { DebuggerBufferReader, DebuggerBufferWriter, IDebuggerBufferReadable } from './DebuggerBuffer';

export enum CommandType {
    KindOfNone = 0,
    KindOfAbort = 1,
    KindOfBreak = 2,
    KindOfContinue = 3,
    KindOfDown = 4,
    KindOfException = 5,
    KindOfFrame = 6,
    KindOfGlobal = 7,
    KindOfHelp = 8,
    KindOfInfo = 9,
    KindOfConstant = 11,
    KindOfList = 12,
    KindOfMachine = 13,
    KindOfNext = 14,
    KindOfOut = 15,
    KindOfPrint = 16,
    KindOfQuit = 17,
    KindOfRun = 18,
    KindOfStep = 19,
    KindOfThread = 20,
    KindOfUp = 21,
    KindOfVariable = 22,
    KindOfVariableAsync = 222,
    KindOfWhere = 23,
    KindOfWhereAsync = 223,
    KindOfExtended = 24,
    KindOfComplete = 27,
    KindOfEval = 1000,
    KindOfShell = 1001,
    KindOfMacro = 1002,
    KindOfConfig = 1003,
    KindOfInstrument = 1004,
    KindOfInterrupt = 10000,
    KindOfSignal = 10001,
    KindOfAuth = 10002
}

export abstract class DebuggerCommand implements IDebuggerBufferReadable {

    public cmdType: CommandType;
    // private cmdClass: string;
    private body: string;
    private version: number;

    public constructor(cmdType: CommandType, body: string = null) {
        this.cmdType = cmdType;
        this.body = body;
    }

    public static FROM(buffer: DebuggerBufferReader): DebuggerCommand {
        const cmdType = buffer.readInt32();
        buffer.readString(); // unused class
        let command: DebuggerCommand;
        switch (cmdType) {
            case CommandType.KindOfInterrupt:
                command = new CmdInterrupt();
                break;
            case CommandType.KindOfMachine:
                command = new CmdMachine();
                break;
            default:
                break;
        }
        command.receive(buffer);
        return command;
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

export class CmdInterrupt extends DebuggerCommand {
    public constructor() {
        super(CommandType.KindOfInterrupt);
    }
}

export class CmdMachine extends DebuggerCommand {

    public constructor(body: string = null, private sandboxes: SandboxInfo[] = null, private force: boolean = false, public succeed: boolean = false) {
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

export class SandboxInfo implements IDebuggerBufferReadable {
    private user: string;
    private name: string;
    private path: string;

    public constructor(user: string = null, name: string = null, path: string = null) {
        this.user = user || '';
        this.name = name || '';
        this.path = path || '';
    }

    public receive(buffer: DebuggerBufferReader) {
        this.user = buffer.readString();
        this.name = buffer.readString();
        this.path = buffer.readString();
    }

    public send(buffer: DebuggerBufferWriter) {
        buffer.writeString(this.user);
        buffer.writeString(this.name);
        buffer.writeString(this.path);
    }
}
