import ts from "typescript";

export type Primitive = "number" | "string" | "boolean";
export type PrimitiveList = "number[]" | "string[]" | "boolean[]";
export type NodeJsNativeObject = "Date";
export type NodeJsNativeObjectList = "Date[]"
type List<T extends string> = `${T}[]`
type PredefinedType = Primitive | NodeJsNativeObject | List<Primitive | NodeJsNativeObject>;

export class TypeSystem {
    private static readonly _primitives = [
        "number", "string", "boolean"
    ];

    static isPrimitive(type: string): type is Primitive {
        return this._primitives.includes(type);
    }

    static isNodeNative(type: string): type is NodeJsNativeObject {
        return type === "Date";//this._nodeNatives.includes(type);
    }

    static isList(type: string): type is List<string> {
        return type.endsWith("[]");
    }

    static isPredefinedType(type: string): type is PredefinedType {
        return this.isPrimitive(type) || this.isNodeNative(type);
    }

    static unpackList(type: string): string {
        if (type.endsWith("[]")) {
            type = type.slice(0, type.length - "[]".length);
        }
        return type;
    }

    static listToScalar(type: string): string {
        if (type.endsWith("[]")) {
            return this.listToScalar(this.unpackList(type));
        }
        return type;
    }

    static typeToBuilderType(type: string): string {
        return `${type}Builder`;
    }
}

export class BuilderFactory {
    private static readonly _factory = ts.factory;
    
    static generate(toBuildEntity: string, properties: [string, string][]) {
        const exportModifier       = [this._factory.createModifier(ts.SyntaxKind.ExportKeyword)];
        const builderIdentifier    = this._factory.createIdentifier(TypeSystem.typeToBuilderType(toBuildEntity));
        const builderProperties    = this.createProperties(properties);
        const builderWithFunctions = this.createWithFunctionMembers(properties);
        const builderBuildFunction = this.createBuildFunctionMember(toBuildEntity, properties.map(p => p[0]));
        const classNameProperty    = this.createClassNameMember(toBuildEntity);

        return this._factory.createClassDeclaration(
            exportModifier,
            builderIdentifier,
            undefined,
            undefined,
            [
                ...builderProperties,
                ...builderWithFunctions,
                builderBuildFunction,
                classNameProperty
            ]
        );
    }

    //--------------------------------------------------------------------------------------------- Members region

    static createProperties(members: [string, string][]): ts.PropertyDeclaration[] {
        const properties: ts.PropertyDeclaration[] = [];
    
        const privateModifier = [this._factory.createModifier(ts.SyntaxKind.PrivateKeyword)];

        for (const [name, type] of members) {
            const initializer = this.getDefaultInitializer(type);
            properties.push(
                this.createMember(name, privateModifier, type, initializer)
            );
        }

        return properties;
    }

    private static getDefaultInitializer(type: string): ts.Expression {
        if (TypeSystem.isList(type))
            return this._factory.createArrayLiteralExpression(
                [ this.getDefaultInitializer(TypeSystem.unpackList(type)) ]
            );
        else if (TypeSystem.isPrimitive(type))  return this.getPrimitiveInitializer(type);
        else if (TypeSystem.isNodeNative(type)) return this.createNewExpression(type);

        return this.createBuildCallOnNewBuilder(TypeSystem.typeToBuilderType(type));
    }

    private static getPrimitiveInitializer(type: Primitive): ts.Expression {
        switch(type) {
            case "boolean":
                return this._factory.createFalse();
            case "number":
                return this._factory.createNumericLiteral(0);
            case "string":
                return this._factory.createStringLiteral("");
            default:
                throw new Error(
                    `PrimitiveInitializerError: ${type} is not a TypeSystem defined primitive`
                );
        }
    }

    // Should be called in a loop with createMember('member', ['private'], memberType, defaultValueForType)
    private static createMember(name: string, modifiers: ts.ModifierLike[] = [], type?: string, initializer?: ts.Expression): ts.PropertyDeclaration {
        const memberName = this._factory.createIdentifier(name);
        const typeNode = typeof type === 'undefined' ? undefined : this.createTypeNode(type);


        return this._factory.createPropertyDeclaration(
            modifiers,  // Property modifiers as ts.ModifierLike[], ie private, readonly, static...
            memberName, // Property name as ts.Identifier
            undefined,  // Question or exclamation token, unsupported at the moment, always undefined
            typeNode,   // Property type as a ts.TypeNode, ie number, string, Date, Foo, Bar... needs to be extend for NodeJS native
            initializer // Initial value of the property as a ts.Expression, ie 0, "abc", new Date(), new Foo()...
        );
    }

    private static createClassNameMember(className: string) {
        const readonlyModifier = [this._factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)];

        return this.createMember(
            "__className",
            readonlyModifier,
            "string",
            this._factory.createStringLiteral(className)
        );
    }

    private static createAssignToThisMember(memberId: string, value: ts.Expression): ts.ExpressionStatement {
        const thisExpression = this._factory.createThis();
        const memberName     = this._factory.createIdentifier(memberId);
        const propertyAccess = this._factory.createPropertyAccessExpression(thisExpression, memberName);
        
        const assignment = ts.factory.createBinaryExpression(
            propertyAccess,
            this._factory.createToken(ts.SyntaxKind.EqualsToken),
            value
        )

        // Produces this.member = value;
        return this._factory.createExpressionStatement(assignment)
    }

    private static createAssignFromPrimitive(memberId: string, value: string): ts.ExpressionStatement {
        // Produces this.member = value;
        return this.createAssignToThisMember(memberId, this._factory.createIdentifier(value))
    }

    private static createAssignFromCallback(memberId: string, callbackBuilderType: string) {
        // Produces new {Class}Builder()
        const newBuilder = this.createNewExpression(
            TypeSystem.typeToBuilderType(
                TypeSystem.listToScalar(callbackBuilderType)
            )
        );
        // Produces callback(newBuilder)
        const callbackCall = this._factory.createCallExpression(this._factory.createIdentifier("callback"), undefined, [newBuilder]);

        // Finally produces this.member = callback(new {Class}Builder());
        return this.createAssignToThisMember(memberId, callbackCall);
    }

    //--------------------------------------------------------------------------------------------- TypeNodes region
    private static createTypeNode(typeName: string): ts.TypeNode {
        if (TypeSystem.isPrimitive(typeName)) {
            return this.getPrimitiveKeywordNode(typeName);
        }

        return this._factory.createTypeReferenceNode(typeName);
    }

    private static getPrimitiveKeywordNode(primitive: Primitive): ts.KeywordTypeNode {
        switch (primitive) {
            case "number":
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
            case "string":
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
            case "boolean":
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
            default:
                throw new Error(`PrimitiveTypeNode error: ${primitive} is not a valid Primitive value.`)
        }
    }

    //--------------------------------------------------------------------------------------------- Functions region
 
    static createBuildFunctionMember(builtObjectType: string, members: string[]): ts.PropertyDeclaration {
        const readonlyModifier = [this._factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)];

        const assignments: ts.PropertyAssignment[] = members.map(member => {
            const memberId   = this._factory.createIdentifier(member);
            const thisId     = this._factory.createThis();
            const value      = this._factory.createPropertyAccessExpression(thisId, memberId);
            const assignment = this._factory.createPropertyAssignment(memberId, value);

            return assignment;
        });

        const builtEntity     = this._factory.createObjectLiteralExpression(assignments, true);
        
        const builtObjectTypeNode = this.createTypeNode(builtObjectType);
        const returnStatement     = this.createReturnStatement("entity", builtEntity);
        const buildFunctionBody   = this.createFunctionBody([returnStatement]);
        const buildFunction       = this._factory.createArrowFunction(
                                        undefined,
                                        undefined,
                                        [],
                                        builtObjectTypeNode,
                                        undefined,
                                        buildFunctionBody
                                    );

        return this.createMember("build", readonlyModifier, undefined, buildFunction);
    }

    static createWithFunctionMembers(members: [string, string][]): ts.PropertyDeclaration[] {
        const functionMembers: ts.PropertyDeclaration[] = [];

        for (const [name, type] of members) {
            const scalar = TypeSystem.isList(type) ? TypeSystem.listToScalar(type) : type;

            const capitalizedName  = `${name[0].toLocaleUpperCase()}${name.slice(1)}`;
            const readonlyModifier = [this._factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)];
            const paramName        = TypeSystem.isPredefinedType(scalar) ? "value": "callback"
            const initializer      = this.createWithFunction(
                name,
                paramName,
                type
            );

            functionMembers.push(
                this.createMember(
                    `with${capitalizedName}`,
                    readonlyModifier,
                    undefined,
                    initializer
                )
            )
        }

        return functionMembers;
    }

    private static createWithFunction(member: string, paramName: "value" | "callback", paramType: string): ts.ArrowFunction {
        const parameters = [this.createParameter(paramName, paramType)];
        const body       = this.createWithFunctionBody(member, paramType, paramName)
        const returnType = this._factory.createThisTypeNode();

        return this._factory.createArrowFunction(
            undefined,  // modifiers
            undefined,  // type parameters
            parameters, // parameters
            returnType, // return type
            undefined,  // arrow token
            body        // body
        );
    }

    private static createBuildCallOnNewBuilder(builderName: string): ts.CallExpression {
        const newBuilder              = this.createNewExpression(builderName);
        const buildFunctionIdentifier = this._factory.createIdentifier("build");
        const buildFunctionAccess     = this._factory.createPropertyAccessExpression(newBuilder, buildFunctionIdentifier);
        const buildFunctionCall       = this._factory.createCallExpression(buildFunctionAccess, undefined, undefined);

        return buildFunctionCall;
    }

    private static createNewExpression(entityName: string) {
        const entityIdentifier = this._factory.createIdentifier(entityName);
        return this._factory.createNewExpression(entityIdentifier, undefined, []);
    }

    private static createParameter(name: "value" | "callback", type: string): ts.ParameterDeclaration {
        const paramName = this._factory.createIdentifier(name);
        const paramType = name === "value" ?
            this.createTypeNode(type) :
            this.createCallbackParameterType(type);

        // Produces value: Primitive or callback: (builder: ClassBuilder) => classBuilder
        return this._factory.createParameterDeclaration(
            undefined, // modifiers
            undefined, // "..."" token
            paramName, // parameterName
            undefined, // questionToken
            paramType, // parameterType
            undefined  // initializer
        )
    }

    private static createCallbackParameterType(entityName: string) {
        const callbackArgName  = this._factory.createIdentifier("builder");
        const entityAsTypeNode = this.createTypeNode(entityName);
        const argumentType     = this.createTypeNode(
            TypeSystem.typeToBuilderType(
                TypeSystem.listToScalar(entityName)
            )
        );
        // Produces builder: ClassName
        const callbackParams = [
            this._factory.createParameterDeclaration(
                undefined, // modifier
                undefined, // ... token
                callbackArgName,
                undefined,
                argumentType,
                undefined
            )
        ];

        // Produces callback: (builder: ClassBuilder) => Class
        return this._factory.createFunctionTypeNode(
            undefined,
            callbackParams,
            entityAsTypeNode
        )
    }

    private static createFunctionBody(statements: ts.Statement[]): ts.Block {
        return this._factory.createBlock(statements, true);
    }

    private static createWithFunctionBody(memberToAssign: string, argType: string, argValue: string): ts.Block {
        const scalar = TypeSystem.listToScalar(argType)
        const assignStatement = TypeSystem.isPredefinedType(scalar) ?
                this.createAssignFromPrimitive(memberToAssign, argValue) :
                this.createAssignFromCallback(memberToAssign, argType);
        
        // Produces { this.member = value; return this; }
        return this.createFunctionBody([
            assignStatement,
            this.createReturnStatement("this")
        ])
    }

    private static createReturnStatement(type: "this" | "entity" | "void", value?: ts.Expression) {
        if (type === "this") {
            // Produces "return this;"
            return ts.factory.createReturnStatement(this._factory.createThis());
        }
        // If value is undefined, produces "return;", else "return value;"
        return this._factory.createReturnStatement(value)
    }
}
