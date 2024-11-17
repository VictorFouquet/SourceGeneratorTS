import * as ts from "typescript";
import { writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { BuilderFactory } from "./builder.factory";
import { ImportFactory } from "./import.factory";
import { EntityAstParser, ParsedEntity } from "./entity.ast-parser";
import { BuilderGeneratorConfig } from "./builder-generator.config";


export class BuilderGenerator {
    private static readonly _targetFolder = `${__dirname}/${BuilderGeneratorConfig.TargetFolderPath}`;
    private static readonly _sourceFolder = `${__dirname}/${BuilderGeneratorConfig.SourceFolderPath}`;
    private static readonly _printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    private static readonly _result = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

    static generate() {
        this.logInfo("Starting generating builders...\n");

        this.createOutputFolder();
        const sourceContent = this.getSourceFolderContent();

        this.logInfo(`Found ${sourceContent.length} entities to map in ./entities folder\n`)

        for (let file of sourceContent) {
            const parsedEntity = this.parseEntitySource(file)

            this.logInfo(`Parsed entity ${parsedEntity.name} from ./entities/${file}`);

            const formattedImportPath = this.getFormattedSourcePath(file);
            const formattedTargetPath = this.getFormattedTargetPath(file);
            const builder = this.createBuilder(formattedImportPath, parsedEntity);

            this.saveBuilder(formattedTargetPath, builder);

            this.logInfo(`Created mapped ${parsedEntity.name}Builder class in ${formattedTargetPath}\n`);
        }
        this.logInfo("Builders generation finished.")
    }

    private static createOutputFolder(): void {
        if (!existsSync(this._targetFolder)) {
            mkdirSync(this._targetFolder);
        }
    }

    private static getSourceFolderContent() {
        return readdirSync(this._sourceFolder).filter(f => f.endsWith(".ts"));
    }

    private static parseEntitySource(fileName: string): ParsedEntity {
        return EntityAstParser.parse(`${this._sourceFolder}/${fileName}`);
    }

    private static getFormattedSourcePath(fileName: string): string {
        return `../entities/${fileName.slice(0, fileName.length - '.ts'.length)}`
    }

    private static getFormattedTargetPath(fileName: string): string {
        const withoutSuffix = fileName.endsWith('.entity.ts') ?
            fileName.slice(0, fileName.length - '.entity.ts'.length) :
            fileName.slice(0, fileName.length - '.ts'.length);

        return `${this._targetFolder}/${withoutSuffix}.builder.ts`;
    }

    private static saveBuilder(targetPath: string, builder: ts.NodeArray<ts.ImportDeclaration | ts.ClassDeclaration>) {
        writeFileSync(
            targetPath,
            this._printer.printList(ts.ListFormat.MultiLine,
            builder,
            this._result
        ), { flag: "w" });
    }

    private static createBuilder(srcPath: string, parsedEntity: ParsedEntity) {
        return ts.factory.createNodeArray([
            ...ImportFactory.generate([[parsedEntity.name, srcPath], ...parsedEntity.imports ?? []]),
            BuilderFactory.generate(parsedEntity.name, parsedEntity.properties)
        ], false)
    }

    private static logInfo(msg: string) {
        console.log(`[INFO] ${msg}`)
    }
}
