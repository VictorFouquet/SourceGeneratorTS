import * as ts from "typescript";
import { writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { BuilderFactory } from "./builder.factory";


//------------------------------------------------------------------------- Helpers

function LogInfo(msg: string) {
    console.log(`[INFO] ${msg}`)
}

//------------------------------------------------------------------------- Source Generation


function createImportDeclaration(className: string, path: string): ts.ImportDeclaration {
    return ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamedImports([
            ts.factory.createImportSpecifier(
                false,
                undefined,
                ts.factory.createIdentifier(className)
            )
        ])
    ), ts.factory.createStringLiteral(path))
}

function createBuilder(srcPath: string, className: string, properties: Properties, dependencies: [string, string][] = []) {
    return ts.factory.createNodeArray([
        createImportDeclaration(className, srcPath),
        ...(dependencies.map(d => createImportDeclaration(...d))),
        BuilderFactory.generate(className, properties)
    ], false)
}

function print() {
    LogInfo("Starting generating builders...\n");

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const result = ts.createSourceFile('~/Documents/coding/ts-puzzles/tmp.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
    const targetFolder = `${__dirname}/builders`;
    const sourceFolder = `${__dirname}/entities`;

    if (!existsSync(targetFolder)) {
        mkdirSync(targetFolder);
    }
    
    const sourceContent = readdirSync(sourceFolder).filter(f => f.endsWith(".ts"));

    LogInfo(`Found ${sourceContent.length} entities to map in ./entities folder\n`)

    for (let file of sourceContent) {
        const parsedEntity = parse(`${sourceFolder}/${file}`);

        LogInfo(`Parsed entity ${parsedEntity.name} from ./entities/${file}`);

        const formattedImportPath = `../entities/${file.slice(0, file.length - '.ts'.length)}`;

        const withoutSuffix = file.endsWith('.entity.ts') ?
            file.slice(0, file.length - '.entity.ts'.length) :
            file.slice(0, file.length - '.ts'.length);
        const formattedOutputPath = `${targetFolder}/${withoutSuffix}.builder.ts`;
    
        writeFileSync(
            formattedOutputPath,
            printer.printList(ts.ListFormat.MultiLine,
            createBuilder(
                formattedImportPath,
                parsedEntity.name,
                parsedEntity.properties,
                parsedEntity.imports
            ),
            result
        ), { flag: "w" });

        LogInfo(`Created mapped ${parsedEntity.name}Builder class in ./builders/${withoutSuffix}.builder.ts\n`);
    }
    LogInfo("Builders generation finished.")
}

print();


//------------------------------------------------------------------------- Data Extraction


type Primitive    = "number" | "boolean" | "string" | "Date";
type PropertyType = Primitive | Exclude<string, Primitive>;
type Properties   = [string, PropertyType][];
type ParsedEntity = {
    imports?:   [string, string][],
    name:       string,
    properties: Properties
}

function visitNode(node: ts.Node, interfaceInfo: Partial<ParsedEntity>, checker: ts.TypeChecker): void {
    // Check if the node is an interface declaration
    if (ts.isSourceFile(node)) {
        // Recursively visit the child nodes of the SourceFile
        ts.forEachChild(node, (node) => visitNode(node, interfaceInfo, checker));
    } else if (ts.isImportDeclaration(node)) {
        if (node.importClause?.namedBindings !== undefined && ts.isNamedImports(node.importClause?.namedBindings)) {
            for (let element of node.importClause.namedBindings.elements) {
                const imported = element.name.text;
                const pathFormatted = `${imported[0].toLocaleLowerCase()}${imported.slice(1)}`;
                interfaceInfo.imports?.push([imported, `../entities/${pathFormatted}.entity`]);
                interfaceInfo.imports?.push([`${imported}Builder`, `./${pathFormatted}.builder`])
            }
        }
    } else if (ts.isInterfaceDeclaration(node)) {
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
    } else if (ts.isTypeAliasDeclaration(node)) {
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

function parse(path: string): ParsedEntity {
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
    visitNode(src, interfaceInfo, checker);

    if (interfaceInfo.name === undefined) {
        throw new Error(`No entity could be found in file ${path}`);
    }

    return {
        imports: interfaceInfo.imports,
        name: interfaceInfo.name,
        properties: interfaceInfo.properties ?? []
    }
}
