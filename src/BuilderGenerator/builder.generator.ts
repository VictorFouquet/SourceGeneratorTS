import * as ts from "typescript";
import { writeFileSync, mkdirSync } from "fs";

const stringKeyword    = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
const numberKeyword    = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
const booleanKeyword   = ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
const undefinedKeyword = ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
const dateKeyword      = ts.factory.createTypeReferenceNode("Date");

function getTypeNode(t: string): ts.TypeNode {
    return t === "string" ?  stringKeyword :
        t === "number" ?  numberKeyword :
        t === "boolean" ? booleanKeyword :
        t === "date" ? dateKeyword :
        undefinedKeyword;
}

function getInitializer(t: string): ts.Expression {
    return t === "string" ? ts.factory.createStringLiteral("") :
        t === "number" ?  ts.factory.createNumericLiteral(0) :
        t === "boolean" ? ts.factory.createFalse() :
        t === "date" ? ts.factory.createNewExpression(
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

function createBuilderClass(className: string, properties: [string, "string" | "number" | "boolean" | "date"][]) {
    return ts.factory.createClassDeclaration(
        undefined,
        ts.factory.createIdentifier(`${className}Builder`),
        undefined,
        undefined,
        [
            ...properties.map(p => getPropertyDeclaration(p[0], p[1], p[1])),
            ...properties.map(p => getMemberAssignFunctionDeclaration(p[0], "value", p[1])),
            getPropertyDeclaration("__className", "string", ts.factory.createStringLiteral(className))
        ]
    )
}

function print() {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const result = ts.createSourceFile('~/Documents/coding/ts-puzzles/tmp.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
    const targetFolder = `${__dirname}/builders`;
    mkdirSync(targetFolder);
    writeFileSync(`${targetFolder}/UserBuilder.ts`, printer.printNode(ts.EmitHint.Unspecified,
        createBuilderClass("User", [["id", "number"], ["email", "string"], ["isAdmin", "boolean"], ["registered", "date"]]), result),
        { flag: "w" }
    )
}

print();
