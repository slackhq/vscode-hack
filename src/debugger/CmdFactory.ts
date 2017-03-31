/**
 *
 */

import { CmdBreak } from './CmdBreak';
import { CmdContinue } from './CmdContinue';
import { CmdInterrupt } from './CmdInterrupt';
import { CmdMachine } from './CmdMachine';
import { CmdSignal } from './CmdSignal';
import { CommandType } from './DebuggerBase';
import { DebuggerBufferReader } from './DebuggerBuffer';
import { DebuggerCommand } from './DebuggerCommand';

// tslint:disable-next-line:export-name
export function create(buffer: DebuggerBufferReader): DebuggerCommand {
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
        case CommandType.KindOfBreak:
            command = new CmdBreak();
            break;
        case CommandType.KindOfContinue:
            command = new CmdContinue();
            break;
        case CommandType.KindOfSignal:
            command = new CmdSignal();
            break;
        default:
            break;
    }
    command.receive(buffer);
    return command;
}