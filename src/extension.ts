"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

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
  const dupForTrans =
      Commands.registerTextEditorCommand("extension.duplicateForTrans", () => {
        // Get the current text editor
        const editor = Window.activeTextEditor;
        if (!editor) {
          Window.showInformationMessage(
              "Open a file first to manipulate text selections");
          return;
        }
        duplicateForTrans(editor);
      });

  context.subscriptions.push(dupForTrans);
}

function duplicateForTrans(editor: TextEditor) {
  const currentRange = getCurrentRange(editor);
  const currentText = editor.document.getText(currentRange);
  const newText = "\n\n" + currentText;

  const uri = editor.document.uri;
  const fileName = editor.document.fileName;
  const fileExt = path.extname(fileName).slice(1);
  const encloseDelimiters: any =
      vscode.workspace.getConfiguration("", uri).get("trans.enclose");

  // enclose with customed delimiters or just comment it
  if (fileExt in encloseDelimiters) {
    editor.edit((e) => {
      e.insert(currentRange.start, encloseDelimiters[fileExt].start + "\n");
      e.insert(currentRange.end, "\n" + encloseDelimiters[fileExt].end);
      // append duplicated text
      e.insert(currentRange.end, newText);
    });
    Commands.executeCommand("cursorMove", { to: "down", by: "line", select: false, value: 4 });
  } else {
    // append duplicated text
    editor.edit((e) => {
      e.insert(currentRange.end, newText);
    });
    editor.selection = new vscode.Selection(currentRange.start, currentRange.end);
    editor.revealRange(currentRange);
    Commands.executeCommand("editor.action.addCommentLine");
    Commands.executeCommand("cursorMove", { to: "down", by: "line", select: false, value: 2 });
  }
}

function getCurrentRange(editor: TextEditor): Range {
  // get current document and cursor position
  const doc = editor.document;
  let cursorPosition: Position = editor.selection.active;

  const regexpTable = {
    [vscode.EndOfLine.LF]: /\n\n+/gm,
    [vscode.EndOfLine.CRLF]: /\r\n(\r\n)+/gm
  };

  const regexp = regexpTable[doc.eol];

  const docContent = doc.getText();
  const eofPosition = doc.positionAt(docContent.length - 1);

  // initial some holders
  let currentParagraph: Range;

  // get paragraphs and selections
  let selectedText: Selection[];
  if (!editor.selection.isEmpty) {  // for selected
    selectedText = editor.selections;
    currentParagraph = new Range(selectedText[0].start, selectedText[0].end);
    return currentParagraph;
  } else {
    let match;
    let start = 0;

    // move down to next non-empty line
    while (doc.lineAt(cursorPosition).isEmptyOrWhitespace &&
      cursorPosition.line !== doc.lineCount - 1) {
      cursorPosition = cursorPosition.translate(1);
    }

    // find current paragraph
    while ((match = regexp.exec(docContent)) !== null) {
      const p = new Range(doc.positionAt(start), doc.positionAt(match.index));
      // cursor is in current paragraph
      if (cursorPosition.isAfterOrEqual(p.start) &&
          cursorPosition.isBeforeOrEqual(p.end)) {
        currentParagraph = p;
        return currentParagraph;
      }
      start = regexp.lastIndex;
    }

    // for last paragraph
    currentParagraph = new Range(doc.positionAt(start), eofPosition);
    return currentParagraph;
  }
}

// this method is called when your extension is deactivated
// tslint:disable-next-line: no-empty
export function deactivate() {}
