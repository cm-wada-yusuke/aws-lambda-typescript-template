import * as archiver from 'archiver';
import * as fs from 'fs';

export class NodeModulesArchives {

    public static archive(): void {

        const modules = './layer_modules';
        const output = fs.createWriteStream('./lambda_layer.zip');
        const archive = archiver('zip', {zlib: {level: 9}});
        archive.pipe(output);
        archive.directory(modules, 'nodejs');
        archive.finalize();
    }
}

NodeModulesArchives.archive();
