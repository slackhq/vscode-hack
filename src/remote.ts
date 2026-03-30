/**
 * @file Helpers for remote connections to hh_client and hhast-lint
 */

import { HackConfig } from "./Config";

export function getCommand(config: HackConfig, command: string): string {
  if (!config.remoteEnabled) {
    return command;
  }

  if (config.remoteType === "ssh") {
    return "ssh";
  } else if (config.remoteType === "docker") {
    return "docker";
  } else {
    // Error for unrecognized remote type
    return command;
  }
}

export function getArgs(
  config: HackConfig,
  command: string,
  args: string[],
): string[] {
  if (!config.remoteEnabled) {
    return args;
  }

  if (config.remoteType === "ssh") {
    return [...config.sshArgs, config.sshHost, command, ...args];
  } else if (config.remoteType === "docker") {
    return ["exec", "-i", config.dockerContainerName, command, ...args];
  } else {
    // Error for unrecognized remote type
    return args;
  }
}
