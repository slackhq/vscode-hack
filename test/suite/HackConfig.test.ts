import * as QUnit from "qunit";
import * as sinon from "sinon";

import { HackConfig } from "../../src/Config";

QUnit.module("HackConfig", (hooks) => {
  const sandbox = sinon.createSandbox();

  hooks.afterEach(() => sandbox.restore());

  QUnit.test(
    "replaces workspace path placeholder in hh_client path",
    (assert) => {
      const wsConfig = { get: sinon.stub() };
      wsConfig.get
        .withArgs("clientPath")
        .returns("${workspaceFolder}/bin/my_custom_hh_client");

      const config = new HackConfig(wsConfig as any, "/home/test/path");

      assert.strictEqual(
        config.clientPath,
        "/home/test/path/bin/my_custom_hh_client",
      );
    },
  );

  QUnit.test("defaults to hh_client for the client path", (assert) => {
    const wsConfig = { get: sinon.stub() };

    const config = new HackConfig(wsConfig as any, "/home/test/path");

    assert.strictEqual(config.clientPath, "hh_client");
  });
});
