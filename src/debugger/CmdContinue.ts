/**
 *
 */

import { CommandType } from './DebuggerBase';
import { DebuggerCommand } from './DebuggerCommand';

export class CmdContinue extends DebuggerCommand {
    public constructor(body: string = '') {
        super(CommandType.KindOfContinue, body);
    }
}
