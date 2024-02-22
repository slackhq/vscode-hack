/**
 * @file Extension providers for intellisense features (hover, autocomplete, goto symbol etc.)
 */

import * as vscode from "vscode";
import * as hh_client from "./proxy";
import { OutlineResponse } from "./types/hack";
import * as utils from "./Utils";

const symbolArray = [
  { key: "function", value: vscode.SymbolKind.Function },
  { key: "method", value: vscode.SymbolKind.Method },
  { key: "class", value: vscode.SymbolKind.Class },
  { key: "const", value: vscode.SymbolKind.Constant },
  { key: "interface", value: vscode.SymbolKind.Interface },
  { key: "enum", value: vscode.SymbolKind.Enum },
  { key: "trait", value: vscode.SymbolKind.Interface },
  { key: "property", value: vscode.SymbolKind.Property },
];

const symbolMap = new Map(
  symbolArray.map<[string, vscode.SymbolKind]>((x) => [x.key, x.value]),
);

const getRange = (
  lineStart: number,
  lineEnd: number,
  charStart: number,
  charEnd: number,
): vscode.Range => {
  return new vscode.Range(
    new vscode.Position(lineStart - 1, charStart - 1),
    new vscode.Position(lineEnd - 1, charEnd - 1),
  );
};

const getSymbolKind = (symbolType: string): vscode.SymbolKind => {
  return symbolMap.get(symbolType) || vscode.SymbolKind.Null;
};

const pushSymbols = (
  outline: OutlineResponse[],
  symbols: vscode.SymbolInformation[],
  container: string,
  indent: string,
) => {
  outline.forEach((element) => {
    let name = element.name;
    const nameIndex = name.lastIndexOf("\\");
    if (nameIndex !== -1) {
      container = name.slice(0, nameIndex);
      name = name.slice(nameIndex + 1);
    }
    let symbolKind = getSymbolKind(element.kind);

    switch (symbolKind) {
      case vscode.SymbolKind.Method:
      case vscode.SymbolKind.Function:
        if (element.name === "__construct") {
          symbolKind = vscode.SymbolKind.Constructor;
        }
        name += "()";
        break;
      default:
    }
    name = indent + name;
    const range = getRange(
      element.span.line_start,
      element.span.line_end,
      element.span.char_start,
      element.span.char_end,
    );
    symbols.push(
      new vscode.SymbolInformation(
        name,
        symbolKind,
        range,
        undefined,
        container,
      ),
    );

    // Check if element has any children, and recursively fetch them as well.
    // NOTE: Do DFS traversal here because we want the groups to be listed together.
    if (element.children && element.children.length > 0) {
      pushSymbols(element.children, symbols, name, `${indent}  `);
    }
  });
};

export class HackHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const wordPosition = document.getWordRangeAtPosition(position);
    if (!wordPosition) {
      return;
    }
    const startPosition = wordPosition.start;
    const line: number = startPosition.line + 1;
    const character: number = startPosition.character + 1;
    return hh_client
      .typeAtPos(utils.mapFromWorkspaceUri(document.uri), line, character)
      .then((hoverType) => {
        if (!hoverType) {
          return;
        }
        if (hoverType.startsWith("(function")) {
          hoverType = hoverType.slice(1, hoverType.length - 1);
        }
        const formattedMessage: vscode.MarkedString = {
          language: "hack",
          value: hoverType,
        };
        return new vscode.Hover(formattedMessage);
      });
  }
}

export class HackDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  public provideDocumentSymbols(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.SymbolInformation[]> {
    return hh_client.outline(document.getText()).then((outline) => {
      const symbols: vscode.SymbolInformation[] = [];
      pushSymbols(outline, symbols, "", "");
      return symbols;
    });
  }
}

export class HackWorkspaceSymbolProvider
  implements vscode.WorkspaceSymbolProvider
{
  public provideWorkspaceSymbols(
    query: string,
  ): vscode.ProviderResult<vscode.SymbolInformation[]> {
    return hh_client.search(query).then((searchResult) => {
      const symbols: vscode.SymbolInformation[] = [];
      searchResult.forEach((element) => {
        const name = element.name.split("\\").pop() || "";
        let desc = element.desc;
        if (desc.includes(" in ")) {
          desc = desc.slice(0, element.desc.indexOf(" in "));
        }
        const kind = getSymbolKind(desc);
        const uri: vscode.Uri = utils.mapToWorkspaceUri(element.filename);
        const container =
          element.scope ||
          (element.name.includes("\\")
            ? element.name.slice(0, element.name.lastIndexOf("\\"))
            : undefined);
        const range = getRange(
          element.line,
          element.line,
          element.char_start,
          element.char_end,
        );
        symbols.push(
          new vscode.SymbolInformation(name, kind, range, uri, container),
        );
      });
      return symbols;
    });
  }
}

export class HackDocumentHighlightProvider
  implements vscode.DocumentHighlightProvider
{
  public provideDocumentHighlights(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.DocumentHighlight[]> {
    return hh_client
      .ideHighlightRefs(
        document.getText(),
        position.line + 1,
        position.character + 1,
      )
      .then((highlightResult) => {
        const highlights: vscode.DocumentHighlight[] = [];
        highlightResult.forEach((element) => {
          const line: number = element.line - 1;
          const charStart: number = element.char_start - 1;
          const charEnd: number = element.char_end;
          highlights.push(
            new vscode.DocumentHighlight(
              new vscode.Range(
                new vscode.Position(line, charStart),
                new vscode.Position(line, charEnd),
              ),
              vscode.DocumentHighlightKind.Text,
            ),
          );
        });
        return highlights;
      });
  }
}

export class HackCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    return hh_client
      .autoComplete(document.getText(), document.offsetAt(position))
      .then((completionResult) => {
        const completionItems: vscode.CompletionItem[] = [];
        completionResult.forEach((element) => {
          let label: string = element.name.split("\\").pop() || "";
          let labelType: string = element.type;
          let kind = vscode.CompletionItemKind.Class;
          if (label.startsWith("$")) {
            label = label.slice(1);
            kind = vscode.CompletionItemKind.Variable;
            labelType = labelType.split("\\").pop() || "";
          } else if (labelType.startsWith("(function")) {
            // If the name and return type matches then it is a constructor
            if (element.name === element.func_details.return_type) {
              kind = vscode.CompletionItemKind.Constructor;
            } else {
              kind = vscode.CompletionItemKind.Method;
            }
            const typeSplit = labelType
              .slice(1, labelType.length - 1)
              .split(":");
            labelType = `${typeSplit[0]}: ${typeSplit[1].split("\\").pop()}`;
          } else if (labelType === "class") {
            kind = vscode.CompletionItemKind.Class;
          }
          const completionItem = new vscode.CompletionItem(label, kind);
          completionItem.detail = labelType;
          completionItems.push(completionItem);
        });
        return completionItems;
      });
  }
}

export class HackDocumentFormattingEditProvider
  implements vscode.DocumentFormattingEditProvider
{
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const text: string = document.getText();
    return hh_client.format(text, 0, text.length).then((formatResult) => {
      if (formatResult.internal_error || formatResult.error_message) {
        return;
      }
      const textEdit = vscode.TextEdit.replace(
        new vscode.Range(
          document.positionAt(0),
          document.positionAt(text.length),
        ),
        formatResult.result,
      );
      return [textEdit];
    });
  }
}

export class HackReferenceProvider implements vscode.ReferenceProvider {
  public provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Location[]> {
    const text = document.getText();
    return hh_client
      .ideFindRefs(text, position.line + 1, position.character + 1)
      .then((foundRefs) => {
        return hh_client
          .ideHighlightRefs(text, position.line + 1, position.character + 1)
          .then((highlightRefs) => {
            const locations: vscode.Location[] = [];
            foundRefs.forEach((ref) => {
              const location = new vscode.Location(
                utils.mapToWorkspaceUri(ref.filename),
                new vscode.Range(
                  new vscode.Position(ref.line - 1, ref.char_start - 1),
                  new vscode.Position(ref.line - 1, ref.char_end),
                ),
              );
              locations.push(location);
            });
            highlightRefs.forEach((ref) => {
              const location = new vscode.Location(
                vscode.Uri.file(document.fileName),
                new vscode.Range(
                  new vscode.Position(ref.line - 1, ref.char_start - 1),
                  new vscode.Position(ref.line - 1, ref.char_end),
                ),
              );
              locations.push(location);
            });
            return locations;
          });
      });
  }
}

export class HackDefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Definition> {
    const text = document.getText();
    return hh_client
      .ideGetDefinition(text, position.line + 1, position.character + 1)
      .then((foundDefinition) => {
        const definition: vscode.Location[] = [];
        foundDefinition.forEach((element) => {
          if (element.definition_pos) {
            const location: vscode.Location = new vscode.Location(
              element.definition_pos.filename
                ? utils.mapToWorkspaceUri(element.definition_pos.filename)
                : document.uri,
              new vscode.Range(
                new vscode.Position(
                  element.definition_pos.line - 1,
                  element.definition_pos.char_start - 1,
                ),
                new vscode.Position(
                  element.definition_pos.line - 1,
                  element.definition_pos.char_end,
                ),
              ),
            );
            definition.push(location);
          }
        });
        return definition;
      });
  }
}
