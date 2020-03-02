/**
 * @file hh_client proxy
 */

import * as ps from "child_process";
import * as config from "./Config";
import * as remote from "./remote";
import * as hack from "./types/hack";

export async function version(): Promise<hack.Version | undefined> {
  return run(["--version"]);
}

export async function check(): Promise<hack.CheckResponse> {
  return run(["check"]);
}

export async function typeAtPos(
  fileName: string,
  line: number,
  character: number
): Promise<string | undefined> {
  const arg: string = `${fileName}:${line}:${character}`;
  const args: string[] = ["--type-at-pos", arg];
  const typeAtPosResponse: hack.TypeAtPosResponse = await run(args);

  if (
    !typeAtPosResponse ||
    !typeAtPosResponse.type ||
    typeAtPosResponse.type === "(unknown)" ||
    typeAtPosResponse.type === "_" ||
    typeAtPosResponse.type === "noreturn"
  ) {
    return undefined;
  }
  return typeAtPosResponse.type;
}

export async function outline(text: string): Promise<hack.OutlineResponse[]> {
  return run(["--outline"], text);
}

export async function search(query: string): Promise<hack.SearchResponse> {
  return run(["--search", query]);
}

export async function ideFindRefs(
  text: string,
  line: number,
  character: number
): Promise<hack.IdeFindRefsResponse> {
  return run(["--ide-find-refs", `${line}:${character}`], text);
}

export async function ideHighlightRefs(
  text: string,
  line: number,
  character: number
): Promise<hack.IdeHighlightRefsResponse> {
  return run(["--ide-highlight-refs", `${line}:${character}`], text);
}

export async function ideGetDefinition(
  text: string,
  line: number,
  character: number
): Promise<hack.IdeGetDefinitionResponse> {
  return run(["--ide-get-definition", `${line}:${character}`], text);
}

export async function autoComplete(
  text: string,
  position: number
): Promise<hack.AutoCompleteResponse> {
  // Insert hh_client autocomplete token at cursor position.
  const autoTok: string = "AUTO332";
  const input = [text.slice(0, position), autoTok, text.slice(position)].join(
    ""
  );
  return run(["--auto-complete"], input);
}

export async function format(
  text: string,
  startPos: number,
  endPos: number
): Promise<hack.FormatResponse> {
  // `endPos` is incremented to stop `hh_client --format` from removing the
  // final character when there is no newline at the end of the file.
  //
  // This appears to be a bug in `hh_client --format`.
  return run(["--format", startPos.toString(), (endPos + 1).toString()], text);
}

async function run(extraArgs: string[], stdin?: string): Promise<any> {
  return new Promise<any>((resolve, _) => {
    const workspacePath =
      config.remoteEnabled && config.remoteWorkspacePath
        ? config.remoteWorkspacePath
        : config.localWorkspacePath;
    const command = remote.getCommand(config.clientPath);
    const args = remote.getArgs(config.clientPath, [
      ...extraArgs,
      "--json",
      "--from",
      "vscode-hack",
      workspacePath
    ]);
    const p = ps.execFile(
      command,
      args,
      { maxBuffer: 1024 * 1024 },
      (err: any, stdout, stderr) => {
        if (err !== null && err.code !== 0 && err.code !== 2) {
          // any hh_client failure other than typecheck errors
          console.error(`Hack: hh_client execution error: ${err}`);
          resolve();
        }
        if (!stdout) {
          // all hh_client --check output goes to stderr by default
          stdout = stderr;
        }
        try {
          const output = JSON.parse(stdout);
          resolve(output);
        } catch (parseErr) {
          console.error(`Hack: hh_client output error: ${parseErr}`);
          resolve();
        }
      }
    );
    if (stdin) {
      p.stdin.write(stdin);
      p.stdin.end();
    }
  });
}
