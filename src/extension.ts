'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import Window = vscode.window;
import Commands = vscode.commands;
import Range = vscode.Range;
import Position = vscode.Position;
import Selection = vscode.Selection;
import TextEditor = vscode.TextEditor;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = Commands.registerTextEditorCommand('extension.duplicateForTrans', () => {

        // Get the current text editor
        let editor = Window.activeTextEditor;
        if (!editor) {
            Window.showInformationMessage('Open a file first to manipulate text selections');
            return;
        }
        duplicateForTrans(editor);
    });

    context.subscriptions.push(disposable);
}

function duplicateForTrans(editor: TextEditor) {
    let currentRange = getCurrentRange(editor);
    let currentText = editor.document.getText(currentRange);
    let newText = "\n\n\n" + currentText;

    // Make changes for docuemnt
    editor.edit((e) => {
        e.insert(currentRange.end, newText);
    })
    editor.selection = new vscode.Selection(currentRange.start, currentRange.end);
    editor.revealRange(currentRange);
    Commands.executeCommand('editor.action.addCommentLine');
    Commands.executeCommand('cursorMove', {
        to: "down",
        by: "line",
        select: false,
        value: 2
    })
}

function getCurrentRange(editor: TextEditor): Range {

    // Get current document and cursor position
    let doc = editor.document;

    let regexpTable = {
        [vscode.EndOfLine.LF]: /\n\n+/gm,
        [vscode.EndOfLine.CRLF]: /\r\n(\r\n)+/gm
    }

    let regexp = regexpTable[doc.eol];

    let docContent = doc.getText();
    let cursorPosition: Position = editor.selection.active;

    // Initial some holders
    let currentParagraph: Range;

    // Get paragraphs and selections
    let selectedText: Selection[];
    if (!editor.selection.isEmpty) {
        selectedText = editor.selections;
        currentParagraph = new Range(selectedText[0].start, selectedText[0].end);
        return currentParagraph;
    } else {
        let match;
        for (let start = 0; (match = regexp.exec(docContent)) !== null; start = regexp.lastIndex) {
            let p = new Range(doc.positionAt(start), doc.positionAt(match.index));
            if (cursorPosition.isAfterOrEqual(p.start) && cursorPosition.isBeforeOrEqual(p.end)) {
                currentParagraph = p;
                return currentParagraph;
            }
        }
    }
    return new Range(cursorPosition, cursorPosition);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
