import { Command } from "commander";
import figlet from "figlet";
import CyberliteRepl from "./repl";

const program = new Command();

console.log(figlet.textSync("Cyberlite") + "\n");

program
  .version("1.0.0")
  .description("A Typescript sqlite clone")
  .argument(
    "[filename]",
    "The name of the database file to read from or create.",
  )
  .action((filename: string) => {
    new CyberliteRepl(filename).start();
  })
  .parse(process.argv);
