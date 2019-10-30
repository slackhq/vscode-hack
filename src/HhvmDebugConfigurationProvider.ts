import * as config from "./Config";
import { WorkspaceFolder, DebugConfigurationProvider, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';

export class HhvmDebugConfigurationProvider implements DebugConfigurationProvider {

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfig: DebugConfiguration, _token?: CancellationToken): ProviderResult<DebugConfiguration> {

        // if launch.json is missing or empty
        if (!debugConfig.type || !debugConfig.request || !debugConfig.name || !folder) {
            return undefined;
        }

        if (debugConfig.type === "hhvm" && debugConfig.request === "launch") {
            if (!debugConfig.script) {
                debugConfig.script = "${file}";
            }

            debugConfig.localWorkspaceRoot = folder.uri.fsPath;
            debugConfig.remoteEnabled = config.remoteEnabled;
            debugConfig.remoteType = config.remoteType;
            debugConfig.remoteWorkspacePath = config.remoteWorkspacePath;
            debugConfig.dockerContainerName = config.dockerContainerName;
        }

        return debugConfig;
    }
}