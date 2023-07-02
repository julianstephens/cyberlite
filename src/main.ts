import yargs from 'yargs';
import { printHelp, startRepl } from './repl';

const argv = yargs(process.argv.slice(2))
  .options({
    h: { type: 'boolean', default: false, alias: 'help' },
  })
  .parseSync();

if (argv.h) {
  printHelp();
}

console.log('');
startRepl();
