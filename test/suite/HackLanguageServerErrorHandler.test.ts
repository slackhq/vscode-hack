import * as QUnit from "qunit";
import * as sinon from "sinon";
import * as vscode from "vscode";

import * as hh_client from "../../src/proxy";
import { HackLanguageServerStatus } from "../../src/HackLanguageServerStatus";
import { HackLanguageServerErrorHandler } from "../../src/HackLanguageServerErrorHandler";
import { CloseAction, ErrorAction } from "vscode-languageclient";

QUnit.module("HackLanguageServerErrorHandler", (hooks) => {
  const sandbox = sinon.createSandbox();
  let clock: sinon.SinonFakeTimers;
  let serverStatus: sinon.SinonStubbedInstance<HackLanguageServerStatus>;
  let errorHandler: HackLanguageServerErrorHandler;

  let hhClientStart: sinon.SinonStub;
  let showErrorMessage: sinon.SinonSpy;
  let showInformationMessage: sinon.SinonSpy;
  let logError: sinon.SinonSpy;

  hooks.beforeEach(() => {
    const log = vscode.window.createOutputChannel("test", { log: true });
    clock = sandbox.useFakeTimers();
    serverStatus = sandbox.createStubInstance(HackLanguageServerStatus);
    errorHandler = new HackLanguageServerErrorHandler(
      serverStatus,
      {} as any,
      log,
    );

    hhClientStart = sandbox.stub(hh_client, "start");
    showErrorMessage = sandbox.spy(vscode.window, "showErrorMessage");
    showInformationMessage = sandbox.spy(
      vscode.window,
      "showInformationMessage",
    );
    logError = sandbox.spy(log, "error");
  });

  hooks.afterEach(() => {
    clock.restore();
    sandbox.restore();
  });

  QUnit.module("error()", () => {
    QUnit.test("returns Continue regardless of error count", (assert) => {
      for (const count of [1, 5, 100]) {
        const result = errorHandler.error(new Error("test"), undefined, count);
        assert.deepEqual(result, { action: ErrorAction.Continue });
      }
    });
  });

  QUnit.module("closed()", () => {
    QUnit.test(
      "restarts immediately if hh_client succeeds on first try",
      async (assert) => {
        hhClientStart.resolves();

        const result = await errorHandler.closed();

        assert.deepEqual(result, { action: CloseAction.Restart });
        sinon.assert.calledOnceWithExactly(
          showErrorMessage,
          "Hack language server exited unexpectedly. It will be automatically restarted.",
        );
        sinon.assert.calledOnceWithExactly(
          showInformationMessage,
          "Hack language server successfully restarted.",
        );
        sinon.assert.calledOnceWithExactly(
          serverStatus.showProgress,
          "Restarting Hack language server...",
        );
        sinon.assert.calledOnce(serverStatus.showSuccess);
        sinon.assert.notCalled(logError);
      },
    );

    QUnit.test(
      "retries and restarts after initial failure then success",
      async (assert) => {
        // First call (immediate) fails, second call (after interval) succeeds
        hhClientStart.onFirstCall().rejects(new Error("hh_client unavailable"));
        hhClientStart.onSecondCall().resolves();

        const closedPromise = errorHandler.closed();
        // Advance past the 10s interval to trigger the retry
        await clock.tickAsync(10_000);

        const result = await closedPromise;

        assert.deepEqual(result, { action: CloseAction.Restart });
        sinon.assert.calledTwice(hhClientStart);
        sinon.assert.calledOnceWithExactly(
          showInformationMessage,
          "Hack language server successfully restarted.",
        );
        sinon.assert.calledOnce(logError);
      },
    );

    QUnit.test("retries multiple times before succeeding", async (assert) => {
      // Fail 3 times, succeed on 4th
      hhClientStart.rejects(new Error("hh_client unavailable"));
      hhClientStart.onCall(3).resolves();

      const closedPromise = errorHandler.closed();
      // Advance through 3 intervals (first call is immediate, then 3 interval ticks)
      await clock.tickAsync(10_000);
      await clock.tickAsync(10_000);
      await clock.tickAsync(10_000);

      const result = await closedPromise;

      assert.deepEqual(result, { action: CloseAction.Restart });
      sinon.assert.callCount(hhClientStart, 4);
      sinon.assert.callCount(logError, 3);
    });

    QUnit.test(
      "gives up after MAX_RESTART_ATTEMPTS and returns DoNotRestart",
      async (assert) => {
        hhClientStart.rejects(new Error("hh_client unavailable"));

        const closedPromise = errorHandler.closed();
        // Advance past all 30 retry attempts
        for (let i = 1; i <= 30; i++) {
          await clock.tickAsync(10_000);
        }

        const result = await closedPromise;

        assert.deepEqual(result, {
          action: CloseAction.DoNotRestart,
          message:
            "Hack language server failed to restart after 30 attempts. Click the status item to try again.",
        });
        sinon.assert.calledOnceWithExactly(
          serverStatus.showError,
          "Hack language server failed to restart after multiple attempts. Click to try again.",
          "hack.restartLSP",
        );
        sinon.assert.callCount(hhClientStart, 31);
        sinon.assert.notCalled(showInformationMessage);
        sinon.assert.callCount(logError, 31);
      },
    );

    QUnit.test("shows progress on each retry attempt", async (assert) => {
      hhClientStart.onFirstCall().rejects(new Error("hh_client unavailable"));
      hhClientStart.onSecondCall().resolves();

      const closedPromise = errorHandler.closed();
      await clock.tickAsync(10_000);
      await closedPromise;

      // Called once for initial attempt, once for retry
      assert.strictEqual(serverStatus.showProgress.callCount, 2);
      sinon.assert.alwaysCalledWithExactly(
        serverStatus.showProgress,
        "Restarting Hack language server...",
      );
    });
  });
});
