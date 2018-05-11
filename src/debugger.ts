/**
 * @file VSCode HHVM Debugger Adapter
 *
 * HHVM already speaks the vscode debugger protocol, so ideally the editor could directly
 * launch or attach to a HHVM process. However, vscode expects debugger communication
 * through stdin/stdout while HHVM needs those for running the program itself and instead
 * exposes the debugger over a TCP port. This adapter is a thin Node executable that connects
 * the two.
 *
 * The current implementation is based on Nuclide's HHVM debug adapter located at
 * https://github.com/facebook/nuclide/blob/master/pkg/nuclide-debugger-hhvm-rpc/lib/hhvmDebugger.js
 *
 */

import * as child_process from 'child_process';
import * as net from 'net';
import * as os from 'os';
import { Writable } from 'stream';
import { OutputEvent } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';

const TWO_CRLF = '\r\n\r\n';
const CONTENT_LENGTH_PATTERN = new RegExp('Content-Length: (\\d+)');
const DEFAULT_HHVM_DEBUGGER_PORT = 8999;
const DEFAULT_HHVM_PATH = 'hhvm';

type DebuggerWriteCallback = (data: string) => void;

interface HhvmAttachRequestArguments extends DebugProtocol.AttachRequestArguments {
    host?: string;
    port?: string;
    remoteSiteRoot?: string;
    localWorkspaceRoot?: string;
    sandboxUser?: string;
}

interface HhvmLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    hhvmPath?: string;
    hhvmArgs?: string[];
    script?: string;
    cwd?: string;
    deferLaunch?: boolean;
    sandboxUser?: string;
}

class HHVMDebuggerWrapper {
    private sequenceNumber: number;
    private currentOutputData: string;
    private currentInputData: string;
    private currentContentLength: number;
    private bufferedRequests: DebugProtocol.Request[];
    private debugging: boolean;
    private debuggerWriteCallback?: DebuggerWriteCallback;
    private nonLoaderBreakSeen: boolean;
    private initializeArgs: DebugProtocol.InitializeRequestArguments;
    // private runInTerminalRequest: Promise<void> | undefined;
    private asyncBreakPending: boolean;

    private remoteSiteRoot: string | undefined;
    private remoteSiteRootPattern: RegExp | undefined;
    private localWorkspaceRoot: string | undefined;
    private localWorkspaceRootPattern: RegExp | undefined;

    constructor() {
        this.sequenceNumber = 0;
        this.currentContentLength = 0;
        this.currentOutputData = '';
        this.currentInputData = '';
        this.bufferedRequests = [];
        this.debugging = false;
        this.nonLoaderBreakSeen = false;
        this.initializeArgs = { adapterID: 'hhvm' };
        this.asyncBreakPending = false;
    }

    public debug() {
        process.stdin.on('data', chunk => {
            this.processClientMessage(chunk);
        });

        process.on('disconnect', () => {
            process.exit();
        });
    }

    private attachTarget(attachMessage: DebugProtocol.AttachRequest, retries: number = 0) {
        const args: HhvmAttachRequestArguments = attachMessage.arguments;
        const attachPort = args.port ? parseInt(args.port, 10) : DEFAULT_HHVM_DEBUGGER_PORT;

        this.remoteSiteRoot = args.remoteSiteRoot;
        this.remoteSiteRootPattern = args.remoteSiteRoot ? new RegExp(this.escapeRegExp(args.remoteSiteRoot), 'g') : undefined;
        this.localWorkspaceRoot = args.localWorkspaceRoot;
        this.localWorkspaceRootPattern = args.localWorkspaceRoot ? new RegExp(this.escapeRegExp(args.localWorkspaceRoot), 'g') : undefined;

        if (Number.isNaN(attachPort)) {
            throw new Error('Invalid HHVM debug port specified.');
        }

        if (!args.sandboxUser || args.sandboxUser.trim() === '') {
            args.sandboxUser = os.userInfo().username;
        }

        const socket = net.createConnection({ port: attachPort });
        socket
            .once('connect', () => {
                socket.on('data', chunk => {
                    this.processDebuggerMessage(chunk);
                });

                socket.on('close', () => {
                    this.writeOutputWithHeader({
                        seq: ++this.sequenceNumber,
                        type: 'event',
                        event: 'hhvmConnectionDied'
                    });
                    process.stderr.write('The connection to the debug target has been closed.');
                    process.exit(0);
                });

                socket.on('disconnect', () => {
                    process.stderr.write('The connection to the debug target has been closed.');
                    process.exit(0);
                });

                const callback = (data: string) => {

                    // Map local workspace file paths to server root, if needed
                    let mappedData = data;
                    if (this.localWorkspaceRootPattern && this.remoteSiteRoot) {
                        mappedData = mappedData.replace(this.localWorkspaceRootPattern, this.remoteSiteRoot);
                    }

                    socket.write(`${mappedData}\0`, 'utf8');
                };

                callback(JSON.stringify(attachMessage));
                this.debuggerWriteCallback = callback;
                this.forwardBufferedMessages();
                this.debugging = true;

                const attachResponse = {
                    request_seq: attachMessage.seq,
                    success: true,
                    command: attachMessage.command
                };
                this.writeResponseMessage(attachResponse);
            })
            .on('error', error => {
                if (retries >= 5) {
                    process.stderr.write(`Error communicating with debugger target: ${error.toString()}\n`);
                    process.exit((<any>error).code);
                } else {
                    // When reconnecting to a target we just disconnected from, especially
                    // in the case of an unclean disconnection, it may take a moment
                    // for HHVM to receive a TCP socket error and realize the client is
                    // gone. Rather than failing to reconnect, wait a moment and try
                    // again to provide a better user experience.
                    setTimeout(() => this.attachTarget(attachMessage, retries + 1), 2000);
                }
            });
    }

    private launchTarget(launchMessage: DebugProtocol.LaunchRequest) {
        const args: HhvmLaunchRequestArguments = launchMessage.arguments;

        if (args.deferLaunch) {
            this.launchTargetInTerminal(launchMessage);
            return;
        }

        let hhvmPath = args.hhvmPath;
        if (!hhvmPath || hhvmPath === '') {
            hhvmPath = DEFAULT_HHVM_PATH;
        }

        if (!args.sandboxUser || args.sandboxUser.trim() === '') {
            args.sandboxUser = os.userInfo().username;
        }

        // const hhvmArgs = args.hhvmArgs;
        const hhvmArgs = ['--mode', 'vsdebug', String(args.script)];
        const options = {
            cwd: args.cwd || process.cwd(),
            // FD[3] is used for communicating with the debugger extension.
            // STDIN, STDOUT and STDERR are the actual PHP streams.
            // If launchMessage.noDebug is specified, start the child but don't
            // connect the debugger fd pipe.
            stdio: Boolean(args.noDebug)
                ? ['pipe', 'pipe', 'pipe']
                : ['pipe', 'pipe', 'pipe', 'pipe'],
            // When the wrapper exits, so does the target.
            detached: false,
            env: process.env
        };

        const targetProcess = child_process.spawn(hhvmPath, hhvmArgs, options);

        // Exit with the same error code the target exits with.
        targetProcess.on('exit', code => process.exit(code));
        targetProcess.on('error', error => process.stderr.write(`${error.toString()}\n`));

        // Wrap any stdout from the target into a VS Code stdout event.
        targetProcess.stdout.on('data', chunk => {
            const block: string = chunk.toString();
            this.writeOutputEvent('stdout', block);
        });
        targetProcess.stdout.on('error', () => { });

        // Wrap any stderr from the target into a VS Code stderr event.
        targetProcess.stderr.on('data', chunk => {
            const block: string = chunk.toString();
            this.writeOutputEvent('stderr', block);
        });
        targetProcess.stderr.on('error', () => { });

        targetProcess.stdio[3].on('data', chunk => {
            this.processDebuggerMessage(chunk);
        });
        targetProcess.stdio[3].on('error', () => { });

        // Read data from the debugger client on stdin and forward to the
        // debugger engine in the target.
        const callback = (data: string) => {
            (<Writable>targetProcess.stdio[3]).write(`${data}\0`, 'utf8');
        };

        callback(JSON.stringify(launchMessage));
        this.debuggerWriteCallback = callback;
        this.forwardBufferedMessages();
        this.debugging = true;
    }

    private launchTargetInTerminal(requestMessage: DebugProtocol.LaunchRequest) {
        // This is a launch in terminal request. Perform the launch and then
        // return an attach configuration.
        const startupArgs: HhvmLaunchRequestArguments = requestMessage.arguments;

        let hhvmPath = startupArgs.hhvmPath;
        if (!hhvmPath || hhvmPath === '') {
            hhvmPath = DEFAULT_HHVM_PATH;
        }

        // Terminal args require everything to be a string, but debug port
        // is typed as a number.
        const terminalArgs = [hhvmPath];
        if (startupArgs.hhvmArgs) {
            for (const arg of startupArgs.hhvmArgs) {
                terminalArgs.push(String(arg));
            }
        }

        const runInTerminalArgs: DebugProtocol.RunInTerminalRequestArguments = {
            kind: 'integrated',
            cwd: __dirname,
            args: terminalArgs
        };

        this.writeOutputWithHeader({
            seq: ++this.sequenceNumber,
            type: 'request',
            command: 'runInTerminal',
            arguments: runInTerminalArgs
        });
        // this.runInTerminalRequest = new Promise();
        // this.runInTerminalRequest.promise;

        const attachConfig: HhvmAttachRequestArguments = {
            // debugPort: startupArgs.debugPort,
            sandboxUser: startupArgs.sandboxUser
        };
        this.attachTarget({ ...requestMessage, arguments: attachConfig });
    }

    private forwardBufferedMessages() {
        if (this.debuggerWriteCallback) {
            const callback = this.debuggerWriteCallback;
            for (const requestMsg of this.bufferedRequests) {
                callback(JSON.stringify(requestMsg));
            }
        }
    }

    private processClientMessage(chunk: Buffer) {
        this.currentInputData += chunk.toString();
        while (true) {
            if (this.currentContentLength === 0) {
                // Look for a content length header.
                this.readContentHeader();
            }

            const length = this.currentContentLength;
            if (length === 0 || this.currentInputData.length < length) {
                // We're not expecting a message, or the amount of data we have
                // available is smaller than the expected message. Wait for more data.
                break;
            }

            const message = this.currentInputData.substr(0, length);
            const requestMsg = JSON.parse(message);
            if (!this.handleWrapperRequest(requestMsg)) {
                const callback = this.debuggerWriteCallback;
                if (callback) {
                    callback(this.translateNuclideRequest(requestMsg));
                }
            }

            // Reset state and expect another content length header next.
            this.currentContentLength = 0;
            this.currentInputData = this.currentInputData.substr(length);
        }
    }

    private translateNuclideRequest(requestMsg: DebugProtocol.Request): string {
        // Nuclide has some extension messages that are not actually part of the
        // VS Code Debug protocol. These are prefixed with "nuclide_" to indicate
        // that they are non-standard requests. Since the HHVM side is agnostic
        // to what IDE it is talking to, these same commands (if they are available)
        // are actually prefixed with a more generic 'fb_' so convert.
        if (requestMsg.command && requestMsg.command.startsWith('nuclide_')) {
            requestMsg.command = requestMsg.command.replace('nuclide_', 'fb_');
            return JSON.stringify(requestMsg);
        }
        return JSON.stringify(requestMsg);
    }

    private handleWrapperRequest(requestMsg: DebugProtocol.Request): boolean {
        // Certain messages should be handled in the wrapper rather than forwarding
        // to HHVM.
        if (requestMsg.command) {
            switch (requestMsg.command) {
                case 'initialize':
                    this.initializeArgs = requestMsg.arguments;
                    this.writeResponseMessage({
                        request_seq: requestMsg.seq,
                        success: true,
                        command: requestMsg.command,
                        body: {
                            exceptionBreakpointFilters: [
                                {
                                    default: false,
                                    label: 'Break On All Exceptions',
                                    filter: 'all'
                                }
                            ],
                            supportsLoadedSourcesRequest: false,
                            supportTerminateDebuggee: false,
                            supportsExceptionOptions: true,
                            supportsModulesRequest: false,
                            supportsHitConditionalBreakpoints: false,
                            supportsConfigurationDoneRequest: true,
                            supportsDelayedStackTraceLoading: true,
                            supportsSetVariable: true,
                            supportsGotoTargetsRequest: false,
                            supportsExceptionInfoRequest: false,
                            supportsValueFormattingOptions: true,
                            supportsEvaluateForHovers: true,
                            supportsRestartRequest: false,
                            supportsConditionalBreakpoints: true,
                            supportsStepBack: false,
                            supportsCompletionsRequest: true,
                            supportsRestartFrame: false,
                            supportsStepInTargetsRequest: false,

                            // Experimental support for terminate thread
                            supportsTerminateThreadsRequest: true
                        }
                    });
                    break;
                case 'disconnect':
                    this.writeResponseMessage({
                        request_seq: requestMsg.seq,
                        success: true,
                        command: requestMsg.command
                    });

                    // Exit this process, which will also result in the child being killed
                    // (in the case of Launch mode), or the socket to the child being
                    // terminated (in the case of Attach mode).
                    process.exit(0);
                    return true;
                case 'launch':
                    this.launchTarget(<DebugProtocol.LaunchRequest>requestMsg);
                    return true;

                case 'attach':
                    this.attachTarget(<DebugProtocol.AttachRequest>requestMsg);
                    return true;

                /*case 'runInTerminal':
                    if (this.runInTerminalRequest) {
                        if ((<any>requestMsg).success) {
                            this.runInTerminalRequest.resolve();
                        } else {
                            this.runInTerminalRequest.reject(new Error(requestMsg.message));
                        }
                    }
                    return true;
                */

                case 'pause': {
                    this.asyncBreakPending = true;
                    return false;
                }

                default:
            }
        }

        if (!this.debugging) {
            // If debugging hasn't started yet, we need to buffer this request to
            // send to the backend once a connection has been established.
            this.bufferedRequests.push(requestMsg);
            return true;
        }

        return false;
    }

    private processDebuggerMessage(chunk: Buffer) {
        this.currentOutputData += chunk.toString();

        // The messages from HHVM are each terminated by a NULL character.
        // Process any complete messages from HHVM.
        let idx = this.currentOutputData.indexOf('\0');
        while (idx > 0) {
            const message = this.currentOutputData.substr(0, idx);

            // Add a sequence number to the data.
            try {
                const obj = JSON.parse(message);
                obj.seq = ++this.sequenceNumber;
                this.writeOutputWithHeader(obj);
            } catch (e) {
                process.stderr.write(`Error parsing message from target: ${e.toString()}: ${message}\n`);
            }

            // Advance to idx + 1 (lose the NULL char)
            this.currentOutputData = this.currentOutputData.substr(idx + 1);
            idx = this.currentOutputData.indexOf('\0');
        }
    }

    private readContentHeader() {
        const idx = this.currentInputData.indexOf(TWO_CRLF);
        if (idx <= 0) {
            return;
        }

        const header = this.currentInputData.substr(0, idx);
        const match = header.match(CONTENT_LENGTH_PATTERN);
        if (!match) {
            throw new Error('Unable to parse message from debugger client');
        }

        // Chop the Content-Length header off the input data and start looking for
        // the message.
        this.currentContentLength = parseInt(match[1], 10);
        this.currentInputData = this.currentInputData.substr(idx + TWO_CRLF.length);
        ++this.sequenceNumber;
    }

    private writeOutputEvent(eventType: string, message: string) {
        const outputEvent: OutputEvent = {
            seq: ++this.sequenceNumber,
            type: 'event',
            event: 'output',
            body: {
                category: eventType,
                output: message
            }
        };
        this.writeOutputWithHeader(outputEvent);
    }

    private writeResponseMessage(message) {
        this.writeOutputWithHeader({
            seq: ++this.sequenceNumber,
            type: 'response',
            ...message
        });
    }

    // Helper to apply compatibility fixes and errata to messages coming
    // from HHVM. Since we have the ability to update this wrapper much
    // more quickly than a new HHVM release, this allows us to modify
    // behavior and fix compatibility bugs before presenting the messages
    // to the client.
    private applyCompatabilityFixes(message) {
        if (message.type === 'response') {
            switch (message.command) {
                case 'threads': {
                    if (Array.isArray(message.body)) {
                        // TODO(ericblue): Fix threads response on the HHVM side.
                        message.body = { threads: message.body };
                    }
                    break;
                }
                case 'stackTrace': {
                    message.body.stackFrames.forEach(stackFrame => {
                        if (stackFrame.source != null) {
                            if (stackFrame.source.path === '<unknown>') {
                                // TODO(ericblue): Delete source when there's none known.
                                delete stackFrame.source;
                            } /*else if (nuclideUri.isAbsolute(stackFrame.source.name)) {
                                // TODO(ericblue): source names shouldn't be absolute paths.
                                stackFrame.source.name = nuclideUri.basename(
                                    stackFrame.source.name,
                                );
                            }*/
                        }
                    });
                    break;
                }
                default:
                // No fixes needed.
            }
        } else if (message.type === 'event') {
            switch (message.event) {
                case 'output': {
                    // Nuclide console requires all output messages to end with a newline
                    // to work properly.
                    if (message.body != null && !message.body.output.endsWith('\n')) {
                        message.body.output += '\n';
                    }

                    // Map custom output types onto explicit protocol types.
                    switch (message.body.category) {
                        case 'warning':
                            message.body.category = 'console';
                            break;
                        case 'error':
                            message.body.category = 'stderr';
                            break;
                        case 'stdout':
                        case 'info':
                            message.body.category = 'log';
                            break;
                        default:
                    }
                    break;
                }
                case 'stopped': {
                    // TODO: Ericblue: Remove this block once HHVM version that always
                    // specifies preserveFocusHint is landed and the supported version.
                    const reason = (message.body.reason || '')
                        .toLowerCase()
                        .split(' ')[0];
                    const focusThread =
                        message.body.threadCausedFocus != null
                            ? message.body.threadCausedFocus
                            : reason === 'step' ||
                            reason === 'breakpoint' ||
                            reason === 'exception';

                    if (message.body.preserveFocusHint == null) {
                        message.body.preserveFocusHint = !focusThread;
                    }

                    break;
                }
                default:
                // No fixes needed.
            }
        }
    }

    private writeOutputWithHeader(message) {
        this.applyCompatabilityFixes(message);

        // TODO(ericblue): Fix breakpoint events format on the HHVM side.
        if (message.type === 'event' && message.event === 'breakpoint') {
            // * Skip 'new' & 'removed' breakpoint events as these weren't triggered by the backend.
            if (message.body.reason !== 'changed') {
                return;
            }
            // * Change `breakpoint.column` to `1` insead of `0`
            message.body.breakpoint.column = 1;
        }

        if (message.type === 'event' && message.event === 'stopped') {
            if (!this.nonLoaderBreakSeen) {
                if (
                    message.body != null &&
                    message.body.description !== 'execution paused'
                ) {
                    // This is the first real (non-loader-break) stopped event.
                    this.nonLoaderBreakSeen = true;
                } else if (!this.asyncBreakPending) {
                    // Hide the loader break from Nuclide.
                    return;
                }
            }

            this.asyncBreakPending = false;
        }

        // Skip forwarding non-focused thread stop events to VSCode's UI
        // to avoid confusing the UX on what thread to focus.
        // https://github.com/Microsoft/vscode-debugadapter-node/issues/147
        if (
            message.type === 'event' &&
            message.event === 'stopped' &&
            ((message.body.threadCausedFocus === false ||
                message.body.preserveFocusHint === true) &&
                this.initializeArgs.clientID !== 'atom')
        ) {
            return;
        }

        let output = JSON.stringify(message);

        // Map server file paths to local workspace, if needed
        if (this.remoteSiteRootPattern && this.localWorkspaceRoot) {
            output = output.replace(this.remoteSiteRootPattern, this.localWorkspaceRoot);
        }

        const length = Buffer.byteLength(output, 'utf8');
        process.stdout.write(`Content-Length: ${length}${TWO_CRLF}`, 'utf8');
        process.stdout.write(output, 'utf8');
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    private escapeRegExp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
}

new HHVMDebuggerWrapper().debug();
