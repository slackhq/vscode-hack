/**
 * Custom client extensions to the language protocol implemented by the
 * Hack Language Server
 */

import { StaticFeature } from 'vscode-languageclient';

export class ProgressIndicator implements StaticFeature {
    public fillClientCapabilities(capabilities): void {
        capabilities.window = {
            status: true,
            progress: true,
            actionRequired: true
        };
    }

    public initialize(): void {
    }
}
