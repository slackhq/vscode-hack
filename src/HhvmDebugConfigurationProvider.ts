import { HackConfig } from "./Config";
import {
  WorkspaceFolder,
  DebugConfigurationProvider,
  DebugConfiguration,
  CancellationToken,
  ProviderResult,
} from "vscode";

export class HhvmDebugConfigurationProvider implements DebugConfigurationProvider {
  constructor(private config: HackConfig) {}

  resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    debugConfig: DebugConfiguration,
    _token?: CancellationToken,
  ): ProviderResult<DebugConfiguration> {
    // if launch.json is missing or empty
    if (
      !debugConfig.type ||
      !debugConfig.request ||
      !debugConfig.name ||
      !folder
    ) {
      return undefined;
    }

    if (debugConfig.type === "hhvm" && debugConfig.request === "launch") {
      if (!debugConfig.script) {
        debugConfig.script = "${file}";
      }

      debugConfig.localWorkspaceRoot = folder.uri.fsPath;
      debugConfig.remoteEnabled = this.config.remoteEnabled;
      debugConfig.remoteType = this.config.remoteType;
      debugConfig.remoteWorkspacePath = this.config.remoteWorkspacePath;
      debugConfig.dockerContainerName = this.config.dockerContainerName;
    }

    return debugConfig;
  }
}
