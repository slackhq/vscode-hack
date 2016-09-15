'use strict';

import cp = require('child_process');

export class HHClient {
    public static getTypeAtPosition(fileName: string, line: number, character: number): Thenable<string> {
        let arg: string = fileName + ":" + line + ":" + character;
        let args: string[] = ['--type-at-pos', arg, "/home/pranay/Documents/Projects/HackFirst"];
        return HHClient.run(args).then(value => {
            value = value.replace("\n", "");
            if (value == "(unknown)" || value == "_") {
                return;
            }
            return value;
        }, reason => {
            throw reason; 
        });
    }

    private static run(args: string[]): Thenable<string> {
        return new Promise<string>((resolve, reject) => {
            // Spawn `hh_client` process
            let p = cp.execFile('hh_client', args, {}, (err, stdout, stderr) => {
                try {
                    if (err) {
                        console.error(err);
                        reject(err)
                    };
                    resolve(stdout.toString());
                } catch (e) {
                    reject(e);
                }
            });
        });
    } 
}