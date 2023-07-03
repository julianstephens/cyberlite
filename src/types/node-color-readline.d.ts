declare module "readline" {
  interface ReadLineOptions {
    question: Function;
    colorize: Function;
  }

  type InterfaceArgs = {
    input: any;
    output: any;
    colorize: (line: string) => string;
    completer: (line: string) => any[];
  };

  function createInterface(args: InterfaceArgs): any;

  type cb = (command: string) => void;

  function question(prompt: string, cb: cb): void;
}

declare module "node-color-readline" {
  import readline from "readline";
  export default readline;
}
