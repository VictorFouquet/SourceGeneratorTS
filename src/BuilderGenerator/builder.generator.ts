import * as ts from "typescript";
import { writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";


//------------------------------------------------------------------------- Helpers

function LogInfo(msg: string) {
    console.log(`[INFO] ${msg}`)
}

//------------------------------------------------------------------------- Source Generation

const stringKeyword    = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
const numberKeyword    = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
const booleanKeyword   = ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
const dateKeyword      = ts.factory.createTypeReferenceNode("Date");

const defaultStringExpression  = ts.factory.createStringLiteral("");
const defaultNumberExpression  = ts.factory.createNumericLiteral(0);
const defaultBooleanExpression = ts.factory.createFalse();
const defaultDateExpression    = createNewExpression("Date");

const exportModifier  = ts.factory.createModifier(ts.SyntaxKind.ExportKeyword);
const privateModifier = ts.factory.createModifier(ts.SyntaxKind.PrivateKeyword);

const buildMemberName = ts.factory.createIdentifier("build");


function createTypeNode(type: string): ts.TypeNode {
    return type === "string"  ? stringKeyword :
        type    === "number"  ? numberKeyword :
        type    === "boolean" ? booleanKeyword :
        type    === "Date"    ? dateKeyword :
        ts.factory.createTypeReferenceNode(type);
}

function createNewExpression(typeName: string): ts.NewExpression {
    return ts.factory.createNewExpression(
        ts.factory.createIdentifier(typeName),
        undefined,
        []
    )
}

function createCallBuildExpression(type: string): ts.CallExpression {
    return ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
            createNewExpression(`${type}Builder`),
            buildMemberName
        ),
        undefined,
        []
    );
}

function createInitializer(type: string): ts.Expression {
    return type === "string"  ? defaultStringExpression :
        type    === "number"  ? defaultNumberExpression :
        type    === "boolean" ? defaultBooleanExpression :
        type    === "Date"    ? defaultDateExpression :
        createCallBuildExpression(type)
}

function createPropertyDeclaration(
    name: string | ts.Identifier,
    type: string | ts.TypeNode,
    initializer: string | ts.Expression,
    isPrivate: boolean = false
) : ts.PropertyDeclaration {
    return ts.factory.createPropertyDeclaration(
        isPrivate ? [privateModifier] : [],
        typeof name === "string" ? ts.factory.createIdentifier(name) : name,
        undefined,
        typeof type === "string" ? createTypeNode(type) : type,
        typeof initializer === "string" ? createInitializer(initializer) : initializer 
    )
}

function createParameterDeclaration(name: string, type: string): ts.ParameterDeclaration {
    let typeNode: ts.TypeNode;

    if (["boolean", "number", "string", "Date"].includes(type)) {  // Parameter is a Primitive
        typeNode = createTypeNode(type);
    } else {                                                       // Parameter is a Callback
        typeNode = ts.factory.createFunctionTypeNode(
            undefined,
            [
                ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    ts.factory.createIdentifier("builder"),
                    undefined,
                    ts.factory.createTypeReferenceNode(`${type}Builder`)
                )
            ],
            ts.factory.createTypeReferenceNode(`${type}Builder`)
        );
    }
    return ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(name),
        undefined,
        typeNode,
        undefined
    )
}

function createMemberAssignStatement(member: string, value: string): ts.ExpressionStatement {
    return ts.factory.createExpressionStatement(
        ts.factory.createBinaryExpression(
            ts.factory.createPropertyAccessExpression(ts.factory.createThis(), ts.factory.createIdentifier(member)),
            ts.factory.createToken(ts.SyntaxKind.EqualsToken),
            ts.factory.createIdentifier(value),
        )
    )
}

function createMemberAssignBlock(member: string, value: string): ts.Block {
    return ts.factory.createBlock(
        [
            createMemberAssignStatement(member, value),
            ts.factory.createReturnStatement(
                ts.factory.createThis()
            )
        ], true
    )
}

function createMemberAssignWithCallbackBlock(member: string, value: string, paramType: string): ts.Block {
    return ts.factory.createBlock([
        ts.factory.createExpressionStatement(
            ts.factory.createBinaryExpression(              // this.[member] = callback(new [Type]Builder()).build()
                ts.factory.createPropertyAccessExpression(  // this.[member]
                    ts.factory.createThis(),                // this
                    ts.factory.createIdentifier(member)     // [member]
                ),
                ts.factory.createToken(ts.SyntaxKind.EqualsToken), // =
                ts.factory.createCallExpression(                   // callback(new [Type]Builder()).build()
                    ts.factory.createPropertyAccessExpression(     // callback(new [Type]Builder()).build
                        ts.factory.createCallExpression(                     // callback(new [Type]Builder())
                            ts.factory.createIdentifier(value),              // callback
                            undefined,
                            [ createNewExpression(`${paramType}Builder`) ]   // new TypeBuilder()
                        ),
                        buildMemberName
                    ),
                    undefined,
                    []
                )
            )
        ),
        ts.factory.createReturnStatement(
            ts.factory.createThis()
        )
    ], true);
}

function createMemberAssignArrowFunction(member: string, paramName: string, paramType: string): ts.ArrowFunction {
    return ts.factory.createArrowFunction(
        undefined,
        undefined,
        [
            createParameterDeclaration(paramName, paramType)
        ],
        ts.factory.createThisTypeNode(),
        undefined,        
        ["boolean", "number", "string", "Date"].includes(paramType) ?
            createMemberAssignBlock(member, paramName) :
            createMemberAssignWithCallbackBlock(member, paramName, paramType)
        
    )
}

function createWithFunctionDeclaration(member: string, paramName: string, paramType: string): ts.PropertyDeclaration {
    return ts.factory.createPropertyDeclaration(
        undefined,
        ts.factory.createIdentifier(`with${member[0].toLocaleUpperCase()}${member.slice(1)}`),
        undefined,
        undefined,
        createMemberAssignArrowFunction(member, paramName, paramType)
    )
}

function createBuiltObjectLiteralExpression(properties: Properties): ts.ObjectLiteralExpression {
    return ts.factory.createObjectLiteralExpression(
        properties.map(p => 
            ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier(p[0]),
                ts.factory.createPropertyAccessExpression(ts.factory.createThis(), p[0])
            )
        ), true
    )
}

function createBuildArrowFunction(className: string, properties: Properties): ts.ArrowFunction {
    return ts.factory.createArrowFunction(
        undefined,
        undefined,
        [],
        ts.factory.createTypeReferenceNode(className),
        undefined,
        ts.factory.createBlock([
            ts.factory.createReturnStatement(
                createBuiltObjectLiteralExpression(properties)
            )
        ], true)
    )
}

function createBuildArrowFunctionDeclaration(className: string, properties: Properties) {
    return ts.factory.createPropertyDeclaration(
        undefined,
        buildMemberName,
        undefined,
        undefined,
        createBuildArrowFunction(className, properties)
    )
}

function createBuilderClassDeclaration(className: string, properties: Properties): ts.ClassDeclaration {
    return ts.factory.createClassDeclaration(
        [exportModifier],
        ts.factory.createIdentifier(`${className}Builder`),
        undefined,
        undefined,
        [
            ...properties.map(p => createPropertyDeclaration(p[0], p[1], p[1], true)),
            ...properties.map(p => createWithFunctionDeclaration(p[0], ["boolean", "string", "number", "Date"].includes(p[1]) ? "value" : "callback", p[1])),
            createBuildArrowFunctionDeclaration(className, properties),
            createPropertyDeclaration("__className", "string", ts.factory.createStringLiteral(className))
        ]
    )
}

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
        createBuilderClassDeclaration(className, properties)
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
