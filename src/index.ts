// @ts-ignore
import yargs from 'yargs';
// @ts-ignore
import {hideBin} from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
    .option('s', {
        alias: 'src',
        demandOption: true,
        describe: 'src to import from',
        type: 'string'
    })
    .option('d', {
        alias: 'dst',
        demandOption: true,
        describe: 'dst to copy files into',
        type: 'string'
    })
    .option('dry', {
        demandOption: false,
        describe: 'dry run',
        type: 'boolean'
    })
    .argv;

const {importer} = require('./importer');

void importer(argv.s, argv.d, argv.dry);