import { createConnection, TextDocuments, Diagnostic, DiagnosticSeverity, ProposedFeatures, CompletionItem, CompletionItemKind, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Definition, DefinitionCategory, dirNames, Section } from './dfndm';
import * as path from 'path';
import { fileURLToPath } from 'url';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments<TextDocument>(TextDocument);

const globalDefinitions = new Map<string, Definition[]>();

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync:   TextDocumentSyncKind.Incremental,
    completionProvider: { resolveProvider: false },
  },
}));

function createError(message: string, line: number, length: number, severity: DiagnosticSeverity = DiagnosticSeverity.Error): Diagnostic {
  return {
    severity: severity,
    range:    {
      start: { line: line, character: 0 },
      end:   { line: line, character: length },
    },
    message: message,
    source:  'uox3dfn',
  };
}

// --- Parser
export function parseDocument(text: string): {
  sections: Section[];
  errors:   Diagnostic[];
} {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  const errors: Diagnostic[] = [];
  let current: Section | undefined = undefined;
  let insideBlock = false;

  for (const [i, line] of lines.entries()) {
    let trimmed = line.trim();
    const commentPos = trimmed.indexOf('//');
    if (commentPos != -1) {
      trimmed = trimmed.substring(0, commentPos - 1).trim();
    }
    // An empty line is an OK line
    if (trimmed.length == 0) {
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (insideBlock) {
        errors.push(createError(`Line ${String(i + 1)}: New section before closing '}'`, i, line.length));
      }
      current = { header: trimmed.slice(1, -1), entries: {}, startLine: i };
      sections.push(current);
      continue;
    }
    if (trimmed === '{') {
      insideBlock = true;
      continue;
    }
    if (trimmed === '}') {
      insideBlock = false;
      continue;
    }
    if (insideBlock && current) {
      const match = /^(\w+)=(.*)$/.exec(trimmed);
      if (!match) {
        errors.push(createError(`Line ${String(i + 1)}: Invalid entry in ${current.header}`, i, line.length));
      } else {
        current.entries[match[1]] = match[2];
        if (match[2].trim().length == 0) {
          errors.push(createError(`Line ${String(i + 1)}: entry ${match[1]} in ${current.header} has no value`, i, line.length, DiagnosticSeverity.Warning));
        }
      }
    } else {
      errors.push(createError(`Line ${String(i + 1)}: Content outside of a block`, i, line.length));
    }
  }
  if (insideBlock) {
    errors.push(createError("File ended before closing '}'", -1, 0));
  }
  return { sections, errors };
}

// --- Validation
function validateTextDocument(doc: TextDocument) {
  const { sections, errors } = parseDocument(doc.getText());
  const def: Definition = {
    name:     parseFileName(doc.uri).file,
    uri:      doc.uri,
    cat:      calculateCat(doc.uri),
    sections: sections,
  };
  const defs = globalDefinitions.get(doc.uri) ?? [];
  defs.push(def);
  globalDefinitions.set(doc.uri, defs);

  void connection.sendDiagnostics({ uri: doc.uri, diagnostics: errors });
}

connection.onCompletion((params): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return [
    {
      label:  'GET',
      kind:   CompletionItemKind.Keyword,
      detail: 'Reference another entry',
    },
    { label: 'PORT', kind: CompletionItemKind.Keyword, detail: 'Numeric port' },
    {
      label:  'ENABLED',
      kind:   CompletionItemKind.Keyword,
      detail: 'Boolean flag',
    },
  ];
});

// --- Lifecycle
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});
documents.listen(connection);
connection.listen();

/**
 * Safely parse a document URI and return just the filename.
 * Works with both vscode-uri and plain file:// URLs.
 */
export function parseFileName(source: string): { dir: string; file: string } {
  try {
    // Prefer vscode-uri if available
    const uri: URI = URI.parse(source);
    const fsPath: string = uri.fsPath;
    return { dir: path.dirname(fsPath), file: path.basename(fsPath) };
  } catch {
    // Fallback: Node's url module
    const fsPath: string = fileURLToPath(source);
    return { dir: path.dirname(fsPath), file: path.basename(fsPath) };
  }
}
function calculateCat(uri: string): DefinitionCategory | undefined {
  const { dir } = parseFileName(uri);
  for (const cat of Object.values(DefinitionCategory) as DefinitionCategory[]) {
    const subset = '/' + dirNames[cat] + '/';
    if (dir.includes(subset)) {
      return cat;
    }
  }
  return undefined;
}
