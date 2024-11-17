import ts from "typescript";
import { NodeJsNativeObject, Primitive } from "./builder.factory";
import { BuilderGeneratorConfig } from "./builder-generator.config";

type Supported    = Primitive | NodeJsNativeObject
type PropertyType = Supported | Exclude<string, Supported>;
export type Properties   = [string, PropertyType][];

export type ParsedEntity = {
    imports?:   [string, string][],
    name:       string,
    properties: Properties
}

export class EntityAstParser {
    static parse(path: string): ParsedEntity {
        const program = ts.createProgram([path], {
            target: ts.ScriptTarget.Latest,
            module: ts.ModuleKind.CommonJS
        });
    
        const src = program.getSourceFile(path);
        const checker = program.getTypeChecker();
    
        if (!src) {
            throw new Error(`Source file not found: ${path}`);
        }
        
        const interfaceInfo: Partial<ParsedEntity> = { properties: [], imports: [] };
        this.visitNode(src, interfaceInfo, checker);
    
        if (interfaceInfo.name === undefined) {
            throw new Error(`No entity could be found in file ${path}`);
        }
    
        return {
            imports: interfaceInfo.imports,
            name: interfaceInfo.name,
            properties: interfaceInfo.properties ?? []
        }
    }

    private static visitNode(node: ts.Node, interfaceInfo: Partial<ParsedEntity>, checker: ts.TypeChecker): void {
        if      (ts.isSourceFile(node))           this.visitSourceFile(node, interfaceInfo, checker);
        else if (ts.isImportDeclaration(node))    this.visitImportNode(node, interfaceInfo);
        else if (ts.isInterfaceDeclaration(node)) this.visitInterfaceDeclaration(node, interfaceInfo, checker);
        else if (ts.isTypeAliasDeclaration(node)) this.visitTypeAliasNode(node, interfaceInfo, checker);
    }

    private static visitSourceFile(node: ts.Node, interfaceInfo: Partial<ParsedEntity>, checker: ts.TypeChecker): void {
        ts.forEachChild(node, (node) => this.visitNode(node, interfaceInfo, checker));
    }

    private static visitImportNode(node: ts.ImportDeclaration, interfaceInfo: Partial<ParsedEntity>): void {
        if (node.importClause?.namedBindings !== undefined && ts.isNamedImports(node.importClause?.namedBindings)) {
            for (let element of node.importClause.namedBindings.elements) {
                const imported = element.name.text;
                interfaceInfo.imports?.push([imported, this.getEntityImportPath(imported)]);
                interfaceInfo.imports?.push([`${imported}Builder`, this.getBuilderImportPath(imported)])
            }
        }
    }

    private static getEntityImportPath(imported: string): string {
        const pathFormatted = `${imported[0].toLocaleLowerCase()}${imported.slice(1)}`;
        return `../${BuilderGeneratorConfig.SourceFolderPath}/${pathFormatted}.entity`;
    }
    
    private static getBuilderImportPath(imported: string): string {
        const pathFormatted = `${imported[0].toLocaleLowerCase()}${imported.slice(1)}`;
        return `./${pathFormatted}.builder`;
    }

    private static visitInterfaceDeclaration(node: ts.InterfaceDeclaration, interfaceInfo: Partial<ParsedEntity>, checker: ts.TypeChecker): void {
        const interfaceName = node.name.getText();
        interfaceInfo.name = interfaceName;
        
        // Visit the properties of the interface
        node.members.forEach((member) => {
            if (ts.isPropertySignature(member)) {
                const propertyName = member.name.getText();
                const propertyType = checker.getTypeAtLocation(member.type!);

                interfaceInfo.properties?.push([propertyName, checker.typeToString(propertyType)]);
            }
        });
    }

    private static visitTypeAliasNode(node: ts.TypeAliasDeclaration, interfaceInfo: Partial<ParsedEntity>, checker: ts.TypeChecker): void {
        const typeName = node.name.getText();
        interfaceInfo.name = typeName;
        
        // If the type alias is defining an object type
        if (ts.isTypeLiteralNode(node.type)) {
            node.type.members.forEach((member) => {
            if (ts.isPropertySignature(member)) {
                const propertyName = member.name.getText();
                const propertyType = checker.getTypeAtLocation(member.type!);
                interfaceInfo.properties?.push([propertyName, checker.typeToString(propertyType)]);
            }
            });
        }
    }
}
