import { Command } from "commander";
import figlet from "figlet";
import env from "./env";
import CyberliteRepl from "./repl";

const program = new Command();

console.log(figlet.textSync("Cyberlite") + "\n");

program
  .version(env.VERSION)
  .description("A Typescript sqlite clone")
  .argument(
    "[path]",
    "The location of the database file to read from or create.",
  )
  .action((path: string) => {
    new CyberliteRepl(path).start();
  })
  .parse(process.argv);

process.on("SIGTERM", () => {
  program.exitOverride();
});
