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
    "[filename]",
    "The name of the database file to read from or create.",
  )
  .action((filename: string) => {
    new CyberliteRepl(filename).start();
  })
  .parse(process.argv);
