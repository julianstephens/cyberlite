import yargs from "yargs";
import logger from "./logger";
import CyberliteRepl from "./repl";

const argv = yargs(process.argv.slice(2))
  .options({
    h: { type: "boolean", default: false, alias: "help" },
    f: { type: "string", default: "./db", alias: "file" },
  })
  .parseSync();

if (argv.h) {
  logger.help();
}

const repl = new CyberliteRepl(argv.f);
repl.start();
