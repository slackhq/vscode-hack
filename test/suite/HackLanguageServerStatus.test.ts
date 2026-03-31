import * as QUnit from "qunit";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { HackLanguageServerStatus } from "../../src/HackLanguageServerStatus";

const baseVersion = {
  commit: "abcdef-4.123.0",
  commit_time: 0,
  api_version: 0,
};

QUnit.module("HackLanguageServerStatus", (hooks) => {
  const sandbox = sinon.createSandbox();

  let statusBarItem: vscode.StatusBarItem;
  let showItem: sinon.SinonSpy;

  hooks.beforeEach(() => {
    statusBarItem = vscode.window.createStatusBarItem();
    showItem = sandbox.spy(statusBarItem, "show");
  });

  hooks.afterEach(() => sandbox.restore());

  QUnit.test("constructor sets status bar text from version", (assert) => {
    new HackLanguageServerStatus(statusBarItem, "", baseVersion);
    assert.strictEqual(statusBarItem.name, "Hack LSP 4.123.0");
  });

  QUnit.test(
    "showError sets error background, text, tooltip, and command",
    (assert) => {
      const status = new HackLanguageServerStatus(
        statusBarItem,
        "",
        baseVersion,
      );
      status.showError("Something went wrong", "hack.restart");

      assert.ok(statusBarItem.backgroundColor instanceof vscode.ThemeColor);
      assert.strictEqual(statusBarItem.text, "$(error) Hack LSP 4.123.0");
      assert.strictEqual(statusBarItem.tooltip, "Something went wrong");
      assert.strictEqual(statusBarItem.command, "hack.restart");
      sinon.assert.calledOnce(showItem);
    },
  );

  QUnit.test("showSuccess clears error state", (assert) => {
    const status = new HackLanguageServerStatus(statusBarItem, "", baseVersion);
    status.showError("err", "cmd");
    status.showSuccess();

    assert.strictEqual(statusBarItem.backgroundColor, undefined);
    assert.strictEqual(statusBarItem.command, undefined);
    assert.strictEqual(statusBarItem.text, "Hack LSP 4.123.0");
    assert.strictEqual(statusBarItem.tooltip, undefined);
    sinon.assert.calledTwice(showItem);
  });

  QUnit.test("showSuccess accepts optional text and tooltip", (assert) => {
    const status = new HackLanguageServerStatus(statusBarItem, "", baseVersion);
    status.showSuccess("Custom text", "Custom tooltip");

    assert.strictEqual(statusBarItem.text, "Custom text");
    assert.strictEqual(statusBarItem.tooltip, "Custom tooltip");
    sinon.assert.calledOnce(showItem);
  });

  QUnit.test("showAlert prepends alert icon to version text", (assert) => {
    const status = new HackLanguageServerStatus(statusBarItem, "", baseVersion);
    status.showAlert("warning detail", "alert tooltip");

    assert.strictEqual(
      statusBarItem.text,
      "$(alert) Hack LSP 4.123.0 warning detail",
    );
    assert.strictEqual(statusBarItem.tooltip, "alert tooltip");
    sinon.assert.calledOnce(showItem);
  });

  QUnit.test("showAlert with no args shows just icon and version", (assert) => {
    const status = new HackLanguageServerStatus(statusBarItem, "", baseVersion);
    status.showAlert();

    assert.strictEqual(statusBarItem.text, "$(alert) Hack LSP 4.123.0");
    sinon.assert.calledOnce(showItem);
  });

  QUnit.test("showProgress shows spinner icon", (assert) => {
    const status = new HackLanguageServerStatus(statusBarItem, "", baseVersion);
    status.showProgress("Loading...");

    assert.strictEqual(statusBarItem.text, "$(sync~spin) Hack LSP 4.123.0");
    assert.strictEqual(statusBarItem.tooltip, "Loading...");
    sinon.assert.calledOnce(showItem);
  });

  QUnit.test(
    "version text falls back when commit has no hyphen-separated suffix",
    (assert) => {
      const version = { commit: "abc123", commit_time: 0, api_version: 0 };
      const status = new HackLanguageServerStatus(statusBarItem, "", version);
      status.showSuccess();

      assert.strictEqual(statusBarItem.text, "Hack LSP abc123");
    },
  );

  QUnit.test(
    "version text includes Remote suffix when SSH remote is enabled",
    (assert) => {
      new HackLanguageServerStatus(statusBarItem, "ssh", baseVersion);
      assert.strictEqual(statusBarItem.name, "Hack LSP 4.123.0 (Remote)");
    },
  );

  QUnit.test(
    "version text includes Docker suffix when Docker remote is enabled",
    (assert) => {
      new HackLanguageServerStatus(statusBarItem, "docker", baseVersion);
      assert.strictEqual(statusBarItem.name, "Hack LSP 4.123.0 (Docker)");
    },
  );
});
