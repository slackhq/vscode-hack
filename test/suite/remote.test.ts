import * as QUnit from "qunit";

import { getArgs, getCommand } from "../../src/remote";
import { HackConfig } from "../../src/Config";

QUnit.module("remote", () => {
  QUnit.test.each(
    "getCommand",
    {
      local: [{ remoteEnabled: false }, "hh_client"],
      ssh: [{ remoteEnabled: true, remoteType: "ssh" }, "ssh"],
      docker: [{ remoteEnabled: true, remoteType: "docker" }, "docker"],
      unrecognized: [
        { remoteEnabled: true, remoteType: "invalid" },
        "hh_client",
      ],
      "configured but not enabled remoteType": [
        { remoteEnabled: false, remoteType: "docker" },
        "hh_client",
      ],
    },
    (assert, [config, expected]) => {
      assert.strictEqual(
        getCommand(config as HackConfig, "hh_client"),
        expected,
      );
    },
  );

  const hhArgs = ["--from", "test", "etc"];

  QUnit.test.each(
    "getArgs",
    {
      local: [{ remoteEnabled: false }, hhArgs],
      ssh: [
        {
          remoteEnabled: true,
          remoteType: "ssh",
          sshArgs: ["-p", "22022"],
          sshHost: "example.com",
        },
        ["-p", "22022", "example.com", "hh_client", ...hhArgs],
      ],
      docker: [
        {
          remoteEnabled: true,
          remoteType: "docker",
          dockerContainerName: "hhvm-test",
        },
        ["exec", "-i", "hhvm-test", "hh_client", ...hhArgs],
      ],
      unrecognized: [{ remoteEnabled: true, remoteType: "invalid" }, hhArgs],
      "configured but not enabled remoteType": [
        { remoteEnabled: false, remoteType: "docker" },
        hhArgs,
      ],
    },
    (assert, [config, expected]) => {
      assert.deepEqual(
        getArgs(config as HackConfig, "hh_client", hhArgs),
        expected,
      );
    },
  );
});
