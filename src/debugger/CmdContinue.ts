/**
 *
 */

import { CmdFlowControl } from './CmdFlowControl';
import { CommandType } from './DebuggerBase';

export class CmdContinue extends CmdFlowControl {
    public constructor(body: string = '', count: number = 0, smallStep: boolean = false) {
        super(CommandType.KindOfContinue, body, count, smallStep);
    }
}
