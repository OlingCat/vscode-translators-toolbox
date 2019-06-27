"use strict";

import * as vscode from "vscode";
import * as path from "path";

import Window = vscode.window;
import Commands = vscode.commands;
import Range = vscode.Range;
import Position = vscode.Position;
import Selection = vscode.Selection;
import TextEditor = vscode.TextEditor;

export function activate(context: vscode.ExtensionContext) {

  const dupForTrans =
    Commands.registerTextEditorCommand("extension.duplicateForTrans", () => {

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
  const enclosingDelimiters: any =
    vscode.workspace.getConfiguration("", uri).get("trans.enclose");

  // enclose with customed delimiters or just comment it
  if (fileExt in enclosingDelimiters) {
    editor.edit((e) => {
      const delimiter: any = enclosingDelimiters[fileExt];
      const textWithDelimiters =
        delimiter.start + "\n"
        + currentText
        + "\n" + delimiter.end
        + "\n\n";
      e.insert(currentRange.start, textWithDelimiters);
      // move cursor to new position
      moveCursorTo(editor, new Position(currentRange.start.line, 0));
    });
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

  // get regexp for corresponding EOL
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

// move cursor to specific position
function moveCursorTo(editor: TextEditor, position: Position) {
  const newSelection = new vscode.Selection(position, position);
  editor.selection = newSelection;
}

// this method is called when your extension is deactivated
// tslint:disable-next-line: no-empty
export function deactivate() { }
