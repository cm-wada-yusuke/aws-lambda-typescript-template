import * as fs from 'fs';
import * as archiver from 'archiver';
import * as path from 'path';

export class NodeModulesArchives {

    public static archive(): void {

        const dist = path.basename(__dirname) + '/dist';

        if (!fs.existsSync(dist)){
            fs.mkdirSync(dist);
        }

        const output = fs.createWriteStream(dist + '/lambda_layer.zip');
        const archive = archiver('zip', {zlib: {level: 9}});
        archive.pipe(output);

        archive.directory('node_modules/', 'nodejs/node_modules');

        archive.finalize();

    }

}

NodeModulesArchives.archive();
