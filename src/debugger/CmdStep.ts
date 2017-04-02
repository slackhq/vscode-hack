/**
 *
 */

import { CmdFlowControl } from './CmdFlowControl';
import { CommandType } from './DebuggerBase';

export class CmdStep extends CmdFlowControl {
    public constructor(body: string = '', count: number = 0, smallStep: boolean = false) {
        super(CommandType.KindOfStep, body, count, smallStep);
    }
}
