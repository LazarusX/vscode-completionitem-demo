"use strict";
import { createScanner, getLocation, JSONScanner, Location, Node, SyntaxKind } from "jsonc-parser";
import * as vscode from "vscode";

export class JsonCompletionItemProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const location: Location = getLocation(document.getText(), document.offsetAt(position));

        // if (location.path[0] === "modules" && location.path[3] === "status") {
            return this.getCompletionItems(["running", "stopped"], document, position, location);
        // }

        // return [];
    }

    private getCompletionItems(values: string[], document: vscode.TextDocument, position: vscode.Position, location: Location): vscode.CompletionItem[] {
        const offset: number = document.offsetAt(position);
        const node: Node | undefined = location.previousNode;

        const overwriteRange: vscode.Range = this.getOverwriteRange(document, position, offset, node);
        const separator: string = this.evaluateSeparaterAfter(document, position, offset, node);

        const completionItems: vscode.CompletionItem[] = [];
        for (let value of values) {
            value = "\"" + value + "\"";
            const completionItem: vscode.CompletionItem = new vscode.CompletionItem(value);
            completionItem.range = overwriteRange;
            completionItem.insertText = value + separator;
            completionItem.kind = vscode.CompletionItemKind.Value;
            completionItems.push(completionItem);
        }

        return completionItems;
    }

    // this method calculates the range to overwrite with the completion text
    private getOverwriteRange(document: vscode.TextDocument, position: vscode.Position, offset: number, node: Node | undefined): vscode.Range {
        let overwriteRange: vscode.Range;
        if (node && node.offset <= offset && offset <= node.offset + node.length
            && (node.type === "property" || node.type === "string" || node.type === "number" || node.type === "boolean" || node.type === "null")) {
            // when the cursor is placed in a node, overwrite the entire content of the node with the completion text
            overwriteRange = new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
        } else {
            // when the cursor is not placed in a node, overwrite the word to the postion with the completion text
            const currentWord: string = this.getCurrentWord(document, position);
            overwriteRange = new vscode.Range(document.positionAt(offset - currentWord.length), position);
        }

        return overwriteRange;
    }

    private getCurrentWord(document: vscode.TextDocument, position: vscode.Position): string {
        let i: number = position.character - 1;
        const text: string = document.lineAt(position.line).text;
        while (i >= 0 && ' \t\n\r\v":{[,'.indexOf(text.charAt(i)) === -1) {
            i--;
        }
        return text.substring(i + 1, position.character);
    }

    // this method evaluates whether to append a comma at the end of the completion text
    private evaluateSeparaterAfter(document: vscode.TextDocument, position: vscode.Position, offset: number, node: Node | undefined) {
        // when the cursor is placed in a node, set the scanner location to the end of the node
        if (node && (node.type === "string" || node.type === "number" || node.type === "boolean" || node.type === "null")) {
            offset = node.offset + node.length;
        }

        const scanner: JSONScanner = createScanner(document.getText(), true);
        scanner.setPosition(offset);
        const token: SyntaxKind = scanner.scan();
        switch (token) {
            // do not append a comman when next token is comma or other close tokens
            case SyntaxKind.CommaToken:
            case SyntaxKind.CloseBraceToken:
            case SyntaxKind.CloseBracketToken:
            case SyntaxKind.EOF:
                return "";
            default:
                return ",";
        }
    }
}
