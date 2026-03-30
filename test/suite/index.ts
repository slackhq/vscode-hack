import * as path from "path";
import { glob } from "glob";
import * as QUnit from "qunit";

export async function run(): Promise<void> {
  const testsRoot = path.resolve(__dirname, "..");

  const files = await glob("**/**.test.js", { cwd: testsRoot });

  QUnit.config.autostart = false;
  // @ts-expect-error not included in DT defs
  QUnit.reporters.tap.init(QUnit);

  await Promise.all(files.map((file) => import(path.resolve(testsRoot, file))));

  return new Promise((resolve, reject) => {
    QUnit.done((details: { failed: number }) => {
      if (details.failed > 0) {
        reject(new Error(`${details.failed} test(s) failed.`));
      } else {
        resolve();
      }
    });

    QUnit.start();
  });
}
