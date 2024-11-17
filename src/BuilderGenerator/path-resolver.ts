import * as path from 'path';
import * as fs from 'fs';
import { BuilderGeneratorConfig } from './builder-generator.config';

interface PathInfo {
    absolutePath: string;
    relativePath: string;    // Relative to script
    importPath: string;      // Relative to builders folder
}

interface BuilderPaths {
    entitiesFolder: PathInfo;
    buildersFolder: PathInfo;
    entityFiles: Array<{
        fileName: string;
        absolutePath: string;
        relativePath: string;   // Relative to script
        importPath: string;     // Relative to builders folder
    }>;
}

export class PathResolver {
    private rootDir: string;
    private scriptPath: string;

    constructor(rootDir: string = process.cwd(), scriptPath: string = __filename) {
        this.rootDir = rootDir;
        this.scriptPath = scriptPath;
    }

    /**
     * Finds folders with specific names recursively
     */
    private findFolder(startPath: string, folderName: string): string | null {
        if (!fs.existsSync(startPath)) {
            return null;
        }

        const files = fs.readdirSync(startPath);

        for (const file of files) {
            const filePath = path.join(startPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (file === folderName) {
                    return filePath;
                }
                const found = this.findFolder(filePath, folderName);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    /**
     * Gets all TypeScript files from a directory
     */
    private getTypeScriptFiles(dirPath: string): string[] {
        return fs.readdirSync(dirPath)
            .filter(file => file.endsWith('.ts'))
            .map(file => path.join(dirPath, file));
    }

    /**
     * Creates a relative path from one location to another
     */
    private getRelativePath(from: string, to: string): string {
        let relativePath = path.relative(path.dirname(from), to);
        // Ensure unix-style paths
        relativePath = relativePath.replace(/\\/g, '/');
        // Add ./ if the path doesn't start with .. or /
        if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
            relativePath = `./${relativePath}`;
        }
        return relativePath;
    }

    /**
     * Creates an import path from builders folder to target file
     */
    private createImportPath(fromBuildersFolder: string, toFile: string): string {
        const relativePath = path.relative(fromBuildersFolder, path.dirname(toFile));
        // Ensure unix-style paths and handle empty relative path
        const normalizedPath = relativePath.replace(/\\/g, '/') || '.';
        return `${normalizedPath}/${path.basename(toFile, '.ts')}`;
    }

    /**
     * Resolves all necessary paths for builder generation
     */
    public resolvePaths(): BuilderPaths {
        // Find entities and builders folders
        const entitiesFolderPath = this.findFolder(this.rootDir, BuilderGeneratorConfig.SourceFolderName);
        const buildersFolderPath = this.findFolder(this.rootDir, BuilderGeneratorConfig.TargetFolderName);

        if (!entitiesFolderPath || !buildersFolderPath) {
            throw new Error('Could not find entities or builders folder');
        }

        // Get all entity files
        const entityFiles = this.getTypeScriptFiles(entitiesFolderPath)
            .map(filePath => ({
                fileName: path.basename(filePath),
                absolutePath: filePath,
                relativePath: this.getRelativePath(this.scriptPath, filePath),
                importPath: this.createImportPath(buildersFolderPath, filePath)
            }));

        return {
            entitiesFolder: {
                absolutePath: entitiesFolderPath,
                relativePath: this.getRelativePath(this.scriptPath, entitiesFolderPath),
                importPath: path.relative(buildersFolderPath, entitiesFolderPath).replace(/\\/g, '/')
            },
            buildersFolder: {
                absolutePath: buildersFolderPath,
                relativePath: this.getRelativePath(this.scriptPath, buildersFolderPath),
                importPath: '.'
            },
            entityFiles
        };
    }
}
