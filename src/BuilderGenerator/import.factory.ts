import ts from "typescript";

export class ImportFactory {
    private static readonly _factory = ts.factory;

    static generate(dependencies: [string, string][]) {
        const importDeclarations: ts.ImportDeclaration[] = [];

        for (let [className, path] of dependencies) {
            const classNameId       = this._factory.createIdentifier(className);
            const pathLiteral       = this._factory.createStringLiteral(path);
            const importSpecifier   = [this._factory.createImportSpecifier(false, undefined, classNameId)];
            const namedImport       = this._factory.createNamedImports(importSpecifier)
            const importClause      = this._factory.createImportClause(false, undefined, namedImport);
            const importDeclaration = this._factory.createImportDeclaration(undefined, importClause, pathLiteral);

            importDeclarations.push(importDeclaration);
        }

        return importDeclarations;
    }
}
