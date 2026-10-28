// @vitest-environment node
/**
 * The proxy only checks that an Admin session cookie is present. Session,
 * second factor and active profile are verified by requireAdmin(), so every
 * exported handler of an Admin page or API route must call it, directly or
 * through a bound delegate branch. The scan walks the TypeScript AST, so
 * comments and another method's guard cannot satisfy a check. Server Actions
 * are covered by server-actions-authorization.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GUARDS = new Set(["requireAdmin", "loadAdminPageAccess"]);
const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
// Public by design: the sign-in page and Better Auth / invitation endpoints.
const PUBLIC_ENTRIES = new Set([
  "src/app/admin/sign-in/[[...sign-in]]/page.tsx",
  "src/app/api/admin/auth/[...all]/route.ts",
  "src/app/api/admin/auth/accept-invitation/route.ts",
]);

type Handler = Readonly<{ name: string; node: ts.Node }>;

function listEntries(directory: string, fileName: string): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) result.push(...listEntries(full, fileName));
    else if (entry === fileName) result.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }

  return result;
}

function parse(file: string): ts.SourceFile {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, readFileSync(path.join(ROOT, file), "utf8"), ts.ScriptTarget.Latest, true, kind);
}

const hasModifier = (node: ts.Node, kind: ts.SyntaxKind) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);

function callsGuard(node: ts.Node, local: ReadonlyMap<string, ts.Node> = new Map(), seen = new Set<ts.Node>()): boolean {
  if (seen.has(node)) return false;
  seen.add(node);
  let found = false;

  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression)) {
      const callee = child.expression.text;
      const helper = local.get(callee);
      if (GUARDS.has(callee) || (helper !== undefined && callsGuard(helper, local, seen))) {
        found = true;
        return;
      }
    }
    ts.forEachChild(child, visit);
  };

  ts.forEachChild(node, visit);
  return found;
}

function localFunctions(source: ts.SourceFile): Map<string, ts.Node> {
  const functions = new Map<string, ts.Node>();

  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) functions.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) functions.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  return functions;
}

function exportedHandlers(source: ts.SourceFile, page: boolean): Handler[] {
  const handlers: Handler[] = [];

  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
      const name = isDefault ? "default" : statement.name?.text ?? "";
      if (page ? isDefault : HTTP_METHODS.has(name)) handlers.push({ name, node: statement });
    }
    if (!page && ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && HTTP_METHODS.has(declaration.name.text) && declaration.initializer !== undefined) {
          handlers.push({ name: declaration.name.text, node: declaration.initializer });
        }
      }
    }
    if (page && ts.isExportAssignment(statement)) handlers.push({ name: "default", node: statement.expression });
  }

  return handlers;
}

function importedModule(source: ts.SourceFile, identifier: string): string | null {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    if (!bindings.elements.some((element) => element.name.text === identifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    return specifier.startsWith("@/") ? `src/${specifier.slice(2)}.ts` : null;
  }

  return null;
}

/**
 * A delegate bound as `METHOD = factory("literal")` passes only when the
 * factory's `if (<firstParam> === "literal")` branch calls a guard.
 */
function delegateBranchGuarded(source: ts.SourceFile, call: ts.CallExpression): boolean {
  if (!ts.isIdentifier(call.expression) || call.arguments.length === 0) return false;
  const [argument] = call.arguments;
  if (argument === undefined || !ts.isStringLiteral(argument)) return false;
  const modulePath = importedModule(source, call.expression.text);
  if (modulePath === null) return false;
  const factory = parse(modulePath).statements.find(
    (statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === (call.expression as ts.Identifier).text,
  );
  const parameter = factory?.parameters[0]?.name;
  if (factory === undefined || parameter === undefined || !ts.isIdentifier(parameter)) return false;
  let guarded = false;

  const visit = (node: ts.Node): void => {
    if (guarded) return;
    if (
      ts.isIfStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isIdentifier(node.expression.left) &&
      node.expression.left.text === parameter.text &&
      ts.isStringLiteral(node.expression.right) &&
      node.expression.right.text === argument.text &&
      callsGuard(node.thenStatement)
    ) {
      guarded = true;
      return;
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(factory, visit);
  return guarded;
}

function unguardedHandlers(file: string): string[] {
  const source = parse(file);
  const local = localFunctions(source);
  const handlers = exportedHandlers(source, file.endsWith("page.tsx"));
  if (handlers.length === 0) return [`${file}: no exported handler`];

  return handlers
    .filter(({ node }) => !(callsGuard(node, local) || (ts.isCallExpression(node) && delegateBranchGuarded(source, node))))
    .map(({ name }) => `${file}#${name}`);
}

const entries = [
  ...listEntries(path.join(ROOT, "src", "app", "admin"), "page.tsx"),
  ...listEntries(path.join(ROOT, "src", "app", "api", "admin"), "route.ts"),
].sort();

describe("Admin route guards behind the cookie-only proxy", () => {
  it("finds the Admin surface", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it("calls requireAdmin() in every exported handler of a non-public Admin page and API route", () => {
    expect(entries.filter((file) => !PUBLIC_ENTRIES.has(file)).flatMap(unguardedHandlers)).toEqual([]);
  });

  it("keeps the public list pointing at existing files", () => {
    for (const file of PUBLIC_ENTRIES) expect(entries, file).toContain(file);
  });

  it("rejects a guard that lives in another method or in a comment", () => {
    const fixture = ts.createSourceFile(
      "fixture.ts",
      [
        'import { requireAdmin } from "@/lib/auth/admin";',
        "// requireAdmin() is mentioned only in this comment for GET.",
        "export async function GET() { return Response.json({}); }",
        "export async function POST() { await requireAdmin(); return Response.json({}); }",
      ].join("\n"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const guarded = exportedHandlers(fixture, false).map(({ name, node }) => [name, callsGuard(node, localFunctions(fixture))]);

    expect(guarded).toEqual([["GET", false], ["POST", true]]);
  });

  it("checks only the bound branch of a delegate factory", () => {
    const source = parse("src/app/api/admin/privacy/route.ts");
    const bind = (literal: string) => {
      const call = ts.factory.createCallExpression(ts.factory.createIdentifier("privacyPostHandler"), undefined, [ts.factory.createStringLiteral(literal)]);
      return delegateBranchGuarded(source, call);
    };

    expect(bind("owner")).toBe(true);
    // The Customer branches use requireCustomer(), never the Admin guard.
    expect(bind("request")).toBe(false);
  });
});
