/**
 *
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

export class SandboxInfo implements IDebuggerBufferReadable {
    private user: string;
    private name: string;
    private path: string;

    public constructor(user: string = '', name: string = '', path: string = '') {
        this.user = user;
        this.name = name;
        this.path = path;
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

export enum BreakPointState {
    Always = -1, // always break when reaching this break point
    Once = 1, // break the first time, then disable
    Disabled = 0 // carry on with execution when reaching this break point
}

export enum BindState {
    KnownToBeValid, // Breakpoint refers to valid location or member
    KnownToBeInvalid, // Breakpoint cannot be bound (no such class or line)
    Unknown // The file or class referenced by breakpoint is not loaded
}

export enum InterruptType {
    // The server is now ready to interact with the debugger
    SessionStarted,
    // The server has terminated the debug session.
    SessionEnded,
    // The server has received a web request
    RequestStarted,
    // The server has sent a response to the web request
    RequestEnded,
    // The server has finished all processing of a web request
    // also known as Post Send Processing has Ended.
    PSPEnded,
    // The server has executed f_hphpd_break()
    HardBreakPoint,
    // The server has reached a point where it has been told to stop and wait
    // for the debugger to tell it to resume execution. For example,
    // a user breakpoint has been reached, or a step command has completed.
    BreakPointReached,
    // The server is about throw an exception
    ExceptionThrown,

    // The server has reached the start of an exception handler.
    ExceptionHandler
    // The above type of interrupt is not sent from the server to the debugger
    // but is used for flow control inside the server. We could consider exposing
    // this type of interrupt to clients, and thus allowing users to request the
    // server to break execution when an interrupt handler is reached, but the
    // value seems quite low at this time.
    // We have assertions that check that these interrupts stays server-side.
}

export class BreakPointInfo implements IDebuggerBufferReadable {
    public constructor(
        private state: BreakPointState = BreakPointState.Always,
        private bindState: BindState = BindState.KnownToBeValid,
        private interruptType: InterruptType = InterruptType.SessionStarted,
        private file: string = '',
        private line1: number = 0,
        private char1: number = 0,
        private line2: number = 0,
        private char2: number = 0,
        private namespaceName: string = '',
        private className: string = '',
        private funcs: FunctionInfo[] = [],
        private url: string = '',
        private regex: boolean = false,
        private check: boolean = false,
        private clause: string = '',
        private output: string = '',
        private exceptionClass: string = '',
        private exceptionObject: string = '') {
    }

    public receive(buffer: DebuggerBufferReader) {
        this.state = buffer.readInt8();
        this.bindState = buffer.readInt8(); // TODO fix
        this.interruptType = buffer.readInt8();
        this.file = buffer.readString();
        this.line1 = buffer.readInt32();
        this.line2 = buffer.readInt32();
        this.namespaceName = buffer.readString();
        this.className = buffer.readString();
        this.funcs = buffer.readArray(FunctionInfo);
        this.url = buffer.readString();
        this.regex = buffer.readBoolean();
        this.check = buffer.readBoolean();
        this.clause = buffer.readString();
        this.output = buffer.readString();
        this.exceptionClass = buffer.readString();
        this.exceptionObject = buffer.readString();
    }

    public send(buffer: DebuggerBufferWriter) {
        buffer.writeInt8(this.state);
        buffer.writeInt8(this.bindState); // TODO fix
        buffer.writeInt8(this.interruptType);
        buffer.writeString(this.file);
        buffer.writeInt32(this.line1);
        buffer.writeInt32(this.line2);
        buffer.writeString(this.className);
        buffer.writeArray(this.funcs);
        buffer.writeString(this.url);
        buffer.writeBoolean(this.regex);
        buffer.writeBoolean(this.check);
        buffer.writeString(this.clause);
        buffer.writeString(this.output);
        buffer.writeString(this.exceptionClass);
        buffer.writeString(this.exceptionObject);
    }

    public static receiveSpecial(buffer: DebuggerBufferReader): BreakPointInfo {
        const file = buffer.readString();
        const line1 = buffer.readInt32();
        const char1 = buffer.readInt32();
        const line2 = buffer.readInt32();
        const char2 = buffer.readInt32();
        const namespaceName = buffer.readString();
        const className = buffer.readString();
        const functionName = buffer.readString();
        const functionInfo = new FunctionInfo(namespaceName, className, functionName);
        const exceptionClass = buffer.readString();
        const exceptionObject = buffer.readString();
        return new BreakPointInfo(null, null, null, file, line1, char1, line2, char2, null, null, [ functionInfo ], null, null, null, null, null, exceptionClass, exceptionObject);
    }
}

export class FunctionInfo implements IDebuggerBufferReadable {
    public constructor(
        private namespaceName: string = '',
        private className: string = '',
        private functionName: string = '') {
    }

    public receive(buffer: DebuggerBufferReader) {
        this.namespaceName = buffer.readString();
        this.className = buffer.readString();
        this.functionName = buffer.readString();
    }

    public send(buffer: DebuggerBufferWriter) {
        buffer.writeString(this.namespaceName);
        buffer.writeString(this.className);
        buffer.writeString(this.functionName);
    }
}
