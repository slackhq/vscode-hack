/**
 * @file VSCode HHVM Debugger Adapter
 *
 * HHVM already speaks the vscode debugger protocol, so ideally this module would
 * have been unnecessary and vscode could directly launch or attach to a HHVM process.
 * However, vscode expects debugger communication through stdin/stdout, while HHVM
 * needs those for running the program itself and instead exposes the debugger over a
 * TCP port. This adapter is thus a thin Node executable that connects the two.
 *
 * The current implementation is copied from Nuclide's HHVM debug adapter at
 * https://github.com/facebook/nuclide/blob/master/pkg/nuclide-debugger-hhvm-rpc/lib/hhvmDebugger.js
 *
 */

import * as fs from 'fs';
import * as net from 'net';

const DEFAULT_HHVM_DEBUGGER_PORT = 8999;
const TWO_CRLF = '\r\n\r\n';
const CONTENT_LENGTH_PATTERN = new RegExp('Content-Length: (\\d+)');

let socketData = '';
let sequenceNumber = 0;

try {
    fs.writeFileSync('/tmp/ext.log', 'Started debugging.\n');
    const socket = net.createConnection({ port: DEFAULT_HHVM_DEBUGGER_PORT });

    socket.on('connect', () => {
        fs.appendFileSync('/tmp/ext.log', 'Socket event: connect.\n');
    });

    socket.on('close', () => {
        fs.appendFileSync('/tmp/ext.log', 'Socket event: close\n');
        process.exit(0);
    });

    socket.on('data', chunk => {
        // fs.appendFileSync('/tmp/ext.log', `Received socket message: ${chunk.toString()}\n`);
        socketData += chunk.toString();
        let idx = socketData.indexOf('\0');
        while (idx > 0) {
            const message = socketData.substr(0, idx);
            const output = JSON.parse(message);
            if (output.type === 'event') {
                // Add a sequence number to the data.
                output.seq = ++sequenceNumber;
            }
            if (output.type === 'response' && output.command === 'threads') {
                // There's a bug in the hhvm implementation of the threads response.
                // `body` should have a single field called `threads` rather than a list of threads.
                output.body = { threads: output.body };
            }
            if (output.type === 'response' && output.command === 'initialize') {
                // Also need to configure that the debugger supports breaking on exceptions
                output.body.exceptionBreakpointFilters = [
                    {
                        filter: 'all',
                        label: 'All Exceptions',
                        default: true
                    }
                ];
                // output.body.supportsExceptionInfoRequest = false;
            }
            if (output.type === 'response' && output.command === 'attach') {
                // don't resend configuration options
                output.body = undefined;
            }
            if (output.type === 'response' && output.command === 'stackTrace') {
                output.body.stackFrames.forEach((o, i, a) => {
                    a[i].column = 5;
                });
            }
            if (output.type === 'event' && output.event === 'stopped') {

                if (output.body.reason.startsWith('Exception')) {
                    output.body.reason = 'exception';
                } else if (output.body.reason.startsWith('Breakpoint')) {
                    output.body.reason = 'breakpoint';
                }
            }
            if (output.type === 'event' && output.event === 'breakpoint') {
                // output.event = 'breakpoint';
                output.body.breakpoint.column = undefined;
                output.body.breakpoint.endLine = undefined;
                output.body.breakpoint.endColumn = undefined;
            }

            writeStdout(output);

            socketData = socketData.substr(idx + 1);
            idx = socketData.indexOf('\0');
        }
    });

    socket.on('error', error => {
        fs.appendFileSync('/tmp/ext.log', `Socket event: error\nMessage:${error.toString()}\n`);
        /*if (retries >= 5) {
            process.stderr.write(
                `Error communicating with debugger target: ${error.toString()}`
            );
            process.exit((<any>error).code);
        } else {
            // When reconnecting to a target we just disconnected from, especially
            // in the case of an unclean disconnection, it may take a moment
            // for HHVM to receive a TCP socket error and realize the client is
            // gone. Rather than failing to reconnect, wait a moment and try
            // again to provide a better user experience.
            setTimeout(() => { this.attachTarget(attachMessage, retries + 1); }, 1000);
        }*/
    });

    let currentContentLength = 0;
    let currentInputData = '';
    process.stdin.on('data', chunk => {
        // fs.appendFileSync('/tmp/ext.log', `Received stdin message: ${chunk.toString()}\n`);
        currentInputData += chunk.toString();
        // tslint:disable-next-line:no-constant-condition
        while (true) {
            if (currentContentLength === 0) {
                // Look for a content length header.
                const idx = currentInputData.indexOf(TWO_CRLF);
                if (idx <= 0) {
                    return;
                }

                const header = currentInputData.substr(0, idx);
                const match = header.match(CONTENT_LENGTH_PATTERN);
                if (!match) {
                    throw new Error('Unable to parse message from debugger client');
                }

                // Chop the Content-Length header off the input data and start looking for
                // the message.
                currentContentLength = parseInt(match[1], 10);
                currentInputData = currentInputData.substr(
                    idx + TWO_CRLF.length
                );
            }

            const length = currentContentLength;
            if (length === 0 || currentInputData.length < length) {
                // We're not expecting a message, or the amount of data we have
                // available is smaller than the expected message. Wait for more data.
                break;
            }

            const message = currentInputData.substr(0, length);
            const data = JSON.parse(message);
            if (data.seq) {
                sequenceNumber = data.seq;
            }
            if (data.command === 'disconnect') {
                socket.end();
                process.exit(0);
            } else if (data.command === 'exceptionInfo') {
                writeStdout({
                    request_seq: data.seq,
                    success: true,
                    type: 'response',
                    command: data.command,
                    body: {
                        exceptionId: 'Fatal Error',
                        description: 'Uncaught Error: Call to undefined function second4()',
                        breakMode: 'always',
                        details: {
                            // tslint:disable-next-line:max-line-length
                            stackTrace: '#0 /home/pranay/repos/hacksite/second.php(8): second3()\n#1 /home/pranay/repos/hacksite/second.php(4): second2()\n#2 /home/pranay/repos/hacksite/second.php(16): second()\n#3 {main}'
                        }
                    }
                });
            } else {
                fs.appendFileSync('/tmp/ext.log', `Sending to HHVM: ${message}\n`);
                socket.write(`${message}\0`, 'utf8');
            }

            // Reset state and expect another content length header next.
            currentContentLength = 0;
            currentInputData = currentInputData.substr(length);
        }
    });
} catch (e) {
    fs.appendFileSync('/tmp/ext.log', `Exception: ${e.toString()}\n`);
}

function writeStdout(output) {
    const message = JSON.stringify(output);
    const length = Buffer.byteLength(message, 'utf8');

    fs.appendFileSync('/tmp/ext.log', `Sending to VSCode: ${message}\n`);
    process.stdout.write(`Content-Length: ${length}${TWO_CRLF}${message}`, 'utf8');
}
