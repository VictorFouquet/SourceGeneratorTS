import * as ts from "typescript";
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from "fs";


//------------------------------------------------------------------------- Source Generation

const stringKeyword    = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
const numberKeyword    = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
const booleanKeyword   = ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
const undefinedKeyword = ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
const dateKeyword      = ts.factory.createTypeReferenceNode("Date");

function getTypeNode(t: string): ts.TypeNode {
    return t === "string" ?  stringKeyword :
        t === "number" ?  numberKeyword :
        t === "boolean" ? booleanKeyword :
        t === "Date" ? dateKeyword :
        undefinedKeyword;
}

function getInitializer(t: string): ts.Expression {
    return t === "string" ? ts.factory.createStringLiteral("") :
        t === "number" ?  ts.factory.createNumericLiteral(0) :
        t === "boolean" ? ts.factory.createFalse() :
        t === "Date" ? ts.factory.createNewExpression(
            ts.factory.createIdentifier("Date"),
            undefined,
            []
        ) :
        ts.factory.createObjectLiteralExpression()
}

function getPropertyDeclaration(name: string | ts.Identifier, type: string | ts.TypeNode, initializer: string | ts.Expression) : ts.PropertyDeclaration {
    return ts.factory.createPropertyDeclaration(
        undefined,
        typeof name === "string" ? ts.factory.createIdentifier(name) : name,
        undefined,
        typeof type === "string" ? getTypeNode(type) : type,
        typeof initializer === "string" ? getInitializer(initializer) : initializer 
    )
}

function getParameterDeclaration(name: string, type: string): ts.ParameterDeclaration {
    return ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(name),
        undefined,
        getTypeNode(type),
        undefined
    )
}

function getMemberAssignStatement(member: string, value: string): ts.ExpressionStatement {
    return ts.factory.createExpressionStatement(
        ts.factory.createBinaryExpression(
            ts.factory.createPropertyAccessExpression(ts.factory.createThis(), ts.factory.createIdentifier(member)),
            ts.factory.createToken(ts.SyntaxKind.EqualsToken),
            ts.factory.createIdentifier(value),
        )
    )
}

function getMemberAssignBlock(member: string, value: string): ts.Block {
    return ts.factory.createBlock(
        [
            getMemberAssignStatement(member, value),
            ts.factory.createReturnStatement(
                ts.factory.createThis()
            )
        ], true
    )
}

function getMemberAssignArrowFunction(member: string, paramName: string, paramType: string): ts.ArrowFunction {
    return ts.factory.createArrowFunction(
        undefined,
        undefined,
        [
            getParameterDeclaration(paramName, paramType)
        ],
        ts.factory.createThisTypeNode(),
        undefined,
        getMemberAssignBlock(member, paramName)
    )
}

function getMemberAssignFunctionDeclaration(member: string, paramName: string, paramType: string): ts.PropertyDeclaration {
    return ts.factory.createPropertyDeclaration(
        undefined,
        ts.factory.createIdentifier(`with${member[0].toLocaleUpperCase()}${member.slice(1)}`),
        undefined,
        undefined,
        getMemberAssignArrowFunction(member, paramName, paramType)
    )
}

function getBuiltObjectLiteralExpression(properties: Properties): ts.ObjectLiteralExpression {
    return ts.factory.createObjectLiteralExpression(
        properties.map(p => 
            ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier(p[0]),
                ts.factory.createPropertyAccessExpression(ts.factory.createThis(), p[0])
            )
        ), true
    )
}

function getBuildArrowFunction(className: string, properties: Properties): ts.ArrowFunction {
    return ts.factory.createArrowFunction(
        undefined,
        undefined,
        [],
        ts.factory.createTypeReferenceNode(className),
        undefined,
        ts.factory.createBlock([
            ts.factory.createReturnStatement(
                getBuiltObjectLiteralExpression(properties)
            )
        ], true)
    )
}

function getBuildArrowFunctionDeclaration(className: string, properties: Properties) {
    return ts.factory.createPropertyDeclaration(
        undefined,
        ts.factory.createIdentifier("build"),
        undefined,
        undefined,
        getBuildArrowFunction(className, properties)
    )
}

function getBuilderClassDeclaration(className: string, properties: Properties): ts.ClassDeclaration {
    return ts.factory.createClassDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(`${className}Builder`),
        undefined,
        undefined,
        [
            ...properties.map(p => getPropertyDeclaration(p[0], p[1], p[1])),
            ...properties.map(p => getMemberAssignFunctionDeclaration(p[0], "value", p[1])),
            getBuildArrowFunctionDeclaration(className, properties),
            getPropertyDeclaration("__className", "string", ts.factory.createStringLiteral(className))
        ]
    )
}

function getImportDeclaration(className: string, path: string): ts.ImportDeclaration {
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

function createBuilder(srcPath: string, className: string, properties: Properties, dependencies: string[] = []) {
    return ts.factory.createNodeArray([
        getImportDeclaration(className, srcPath),
        getBuilderClassDeclaration(className, properties)
    ], false)
}

function print() {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const result = ts.createSourceFile('~/Documents/coding/ts-puzzles/tmp.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
    const targetFolder = `${__dirname}/builders`;
    const sourceFolder = `${__dirname}/entities`;

    if (!existsSync(targetFolder)) {
        mkdirSync(targetFolder);
    }
    
    const sourceContent = readdirSync(sourceFolder).filter(f => f.endsWith(".ts"));
    for (let file of sourceContent) {
        const source = readFileSync(`${sourceFolder}/${file}`).toString();
        const parsedEntity = parse(`${sourceFolder}/${file}`);

        writeFileSync(`${targetFolder}/${parsedEntity.name}Builder.ts`, printer.printList(ts.ListFormat.MultiLine,
            createBuilder(
                `../entities/${file.slice(0, file.length - '.ts'.length)}`,
                parsedEntity.name,
                parsedEntity.properties
            ),
            result
        ), { flag: "w" });
    }
}

print();


//------------------------------------------------------------------------- Data Extraction


type Primitive    = "number" | "boolean" | "string" | "Date";
type Properties   = [string, Primitive][];
type ParsedEntity = {
    imports?:   string[],
    name:       string,
    properties: Properties
}

function visitNode(node: ts.Node, interfaceInfo: Record<string, { [key: string]: Primitive }>, checker: ts.TypeChecker): void {
    // Check if the node is an interface declaration
    if (ts.isSourceFile(node)) {
        // Recursively visit the child nodes of the SourceFile
        ts.forEachChild(node, (node) => visitNode(node, interfaceInfo, checker));
    } else if (ts.isInterfaceDeclaration(node)) {
        console.log("IsInterface")
        const interfaceName = node.name.getText();
        interfaceInfo[interfaceName] = {};

        // Visit the properties of the interface
        node.members.forEach((member) => {
            if (ts.isPropertySignature(member)) {
                const propertyName = member.name.getText();
                const propertyType = checker.getTypeAtLocation(member.type!);
                const serialized = checker.typeToString(propertyType) === 'string' ? 'string' :
                    checker.typeToString(propertyType) === 'number' ? 'number' :
                    checker.typeToString(propertyType) === 'boolean' ? 'boolean' : 'Date';
    
                interfaceInfo[interfaceName][propertyName] = serialized;
            }
        });
    }
}

function parse(path: string): ParsedEntity {
    console.log("Parse")
    const program = ts.createProgram([path], {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.CommonJS
    });

    const src = program.getSourceFile(path);
    const checker = program.getTypeChecker();

    if (!src) {
        throw new Error(`Source file not found: ${path}`);
    }
    
    const interfaceInfo: Record<string, { [key: string]: Primitive }> = {};
    console.log("bout to visit")
    visitNode(src, interfaceInfo, checker);

    const entityName = Object.keys(interfaceInfo)[0];
    console.log(interfaceInfo, entityName)
    return {
        name: entityName,
        properties: Object.entries(interfaceInfo[entityName])
    }
}
