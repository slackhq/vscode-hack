/**
 * Types for custom LSP extensions
 */

import { Range } from "vscode";
import { TextDocumentIdentifier } from "vscode-languageclient/lib/main";

type TypeCoverageResponse = {
  coveredPercent: number;
  uncoveredRanges: {
    message: string;
    range: Range;
  }[];
  defaultMessage: string;
};

type ShowStatusRequest = {
  shortMessage?: string;
  message?: string;
  type: number;
};
