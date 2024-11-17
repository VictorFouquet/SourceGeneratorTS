import * as ts from "typescript";
import { writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { BuilderFactory } from "./builder.factory";
import { ImportFactory } from "./import.factory";
import { EntityAstParser, Properties } from "./entity.ast-parser";


//------------------------------------------------------------------------- Helpers

function LogInfo(msg: string) {
    console.log(`[INFO] ${msg}`)
}

//------------------------------------------------------------------------- Source Generation




function createBuilder(srcPath: string, className: string, properties: Properties, dependencies: [string, string][] = []) {
    return ts.factory.createNodeArray([
        ...ImportFactory.generate([[className, srcPath], ...dependencies]),
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
        const parsedEntity = EntityAstParser.parse(`${sourceFolder}/${file}`);

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
