import * as fs from "fs";
import * as path from "path";
import * as QUnit from "qunit";

// The VS Code version that the current Cursor release ships as its base. Cursor
// tracks several minor versions behind upstream VS Code, so an `engines.vscode`
// requirement newer than this makes the extension fail to install on Cursor
// (it shows up greyed out / non-functional until manually downgraded).
//
// Bump this only after confirming the Cursor base has actually moved forward.
// See https://github.com/slackhq/vscode-hack/pull/281 for the change that
// motivated this guard.
const CURSOR_VSCODE_BASE = { major: 1, minor: 105 };

// Parses a caret range like "^1.105.0" into its minimum { major, minor }.
function parseMinimumVersion(range: string): { major: number; minor: number } {
  const match = /^\^?(\d+)\.(\d+)\./.exec(range);
  if (!match) {
    throw new Error(`Unable to parse VS Code engine range: ${range}`);
  }
  return { major: Number(match[1]), minor: Number(match[2]) };
}

QUnit.module("vscode engine compatibility", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"),
  ) as { engines: { vscode: string } };

  QUnit.test(
    "engines.vscode stays compatible with the Cursor VS Code base",
    (assert) => {
      const min = parseMinimumVersion(pkg.engines.vscode);

      const withinRange =
        min.major < CURSOR_VSCODE_BASE.major ||
        (min.major === CURSOR_VSCODE_BASE.major &&
          min.minor <= CURSOR_VSCODE_BASE.minor);

      assert.true(
        withinRange,
        `engines.vscode (${pkg.engines.vscode}) requires a newer VS Code than ` +
          `Cursor's base (${CURSOR_VSCODE_BASE.major}.${CURSOR_VSCODE_BASE.minor}.x); ` +
          `the extension will fail to install on Cursor. Relax the requirement or ` +
          `update CURSOR_VSCODE_BASE once Cursor's base has moved forward.`,
      );
    },
  );
});
