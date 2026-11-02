import * as QUnit from "qunit";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { HackConfig } from "../../src/Config";
import { formatDocument } from "../../src/formatter";

QUnit.module("formatter", (hooks) => {
  const sandbox = sinon.createSandbox();
  let log: vscode.LogOutputChannel;
  let logError: sinon.SinonSpy;
  let showErrorMessage: sinon.SinonStub;
  let document: vscode.TextDocument;

  const token = new vscode.CancellationTokenSource().token;

  // Runs an inline Node.js script as the formatter
  const configFor = (script: string) =>
    ({
      formatterPath: process.execPath,
      formatterArgs: ["-e", script],
      localWorkspacePath: process.cwd(),
    }) as HackConfig;

  hooks.beforeEach(async () => {
    log = vscode.window.createOutputChannel("test", { log: true });
    logError = sandbox.spy(log, "error");
    showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage");
    document = await vscode.workspace.openTextDocument({
      content: "<?hh\nfunction foo(): void {}\n",
    });
  });

  hooks.afterEach(() => {
    sandbox.restore();
    log.dispose();
  });

  QUnit.test(
    "replaces the document with the formatter output",
    async (assert) => {
      const config = configFor(
        "process.stdin.on('data', d => process.stdout.write(d.toString().toUpperCase()))",
      );

      const edits = await formatDocument(config, document, log, token);

      assert.strictEqual(edits?.length, 1);
      assert.strictEqual(edits![0].newText, "<?HH\nFUNCTION FOO(): VOID {}\n");
      assert.true(
        edits![0].range.isEqual(
          new vscode.Range(0, 0, document.lineCount - 1, 0),
        ),
      );
    },
  );

  QUnit.test("returns no edits if output is unchanged", async (assert) => {
    const config = configFor("process.stdin.pipe(process.stdout)");

    const edits = await formatDocument(config, document, log, token);

    assert.deepEqual(edits, []);
  });

  QUnit.test("reports formatter failures", async (assert) => {
    const config = configFor("console.error('syntax error'); process.exit(1)");

    const edits = await formatDocument(config, document, log, token);

    assert.strictEqual(edits, undefined);
    assert.true(logError.calledOnce);
    assert.true(
      showErrorMessage.calledOnceWith(
        "Hack formatter failed: exited with code 1: syntax error",
      ),
    );
  });

  QUnit.test("reports missing formatter executable", async (assert) => {
    const config = {
      formatterPath: "/nonexistent/hackfmt",
      formatterArgs: [],
      localWorkspacePath: process.cwd(),
    } as unknown as HackConfig;

    const edits = await formatDocument(config, document, log, token);

    assert.strictEqual(edits, undefined);
    assert.true(showErrorMessage.calledOnce);
  });
});
