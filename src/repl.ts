import chalk from 'chalk';
import readline from 'node-color-readline';

let multilineBuffer = '';

export let defaultPrompt = '> ',
  moreLinesPrompt = '...';

export const welcomePrompt = `
${chalk.blue('cyberlite')}: Typescript sqlite clone
type in a command to begin
type ${chalk.magenta('.help')} for a list of repl commands
`;

const colorize = (line: string) => {
  let colorized = '';
  let regex: [RegExp, string][] = [
    [/\/\/.*$/m, 'grey'], // comment
    [/(['"`\/]).*?(?!<\\)\1/, 'cyan'], // string/regex, not rock solid
    [/[+-]?(\d+\.?\d*|\d*\.\d+)([eE][+-]?\d+)?/, 'cyan'], // number
    [/\b(true|false|null|undefined|NaN|Infinity)\b/, 'blue'],
    [
      /\b(in|if|for|while|var|new|function|do|return|void|else|break)\b/,
      'green',
    ],
    [
      /\b(instanceof|with|case|default|try|this|switch|continue|typeof)\b/,
      'green',
    ],
    [/\b(let|yield|const|class|extends|interface|type)\b/, 'green'],
    [/\b(try|catch|finally|Error|delete|throw|import|from|as)\b/, 'red'],
    [
      /\b(eval|isFinite|isNaN|parseFloat|parseInt|decodeURI|decodeURIComponent)\b/,
      'yellow',
    ],
    [
      /\b(encodeURI|encodeURIComponent|escape|unescape|Object|Function|Boolean|Error)\b/,
      'yellow',
    ],
    [
      /\b(Number|Math|Date|String|RegExp|Array|JSON|=>|string|number|boolean)\b/,
      'yellow',
    ],
    [/\b(console|module|process|require|arguments|fs|global)\b/, 'yellow'],
    [/\b(private|public|protected|abstract|namespace|declare|@)\b/, 'magenta'], // TS keyword
    [/\b(keyof|readonly)\b/, 'green'],
  ];

  while (line !== '') {
    let start = +Infinity;
    let color = '';
    let length = 0;
    for (let reg of regex) {
      let match = reg[0].exec(line);
      if (match && match.index < start) {
        start = match.index;
        color = reg[1];
        length = match[0].length;
      }
    }
    colorized += line.substring(0, start);
    if (color) {
      colorized += (<any>line.substring(start, length))[color];
    }
    line = line.substring(start + length);
  }
  return colorized;
};

const createReadLine = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    colorize: colorize,
  });
};

let rl = createReadLine();

const replLoop = (_: string, code: string) => {
  code = multilineBuffer + '\n' + code;
  repl(defaultPrompt);
};

export const printHelp = () => {
  console.log(
    `
${chalk.blue('cyberlite repl commands')}
${chalk.yellow('.clear')}              clear all the code
${chalk.magenta('.help')}              print this manual
${chalk.red('.exit')}                  leave the repl
    `,
  );
};

export const repl = (prompt: string) => {
  rl.question(prompt, function (code: string) {
    if (/^\.help/.test(code)) {
      printHelp();
      return repl(prompt);
    }
    if (/^\.clear/.test(code)) {
      console.clear();
      multilineBuffer = '';
      return repl(defaultPrompt);
    }
    if (/^\.exit/.test(code)) {
      console.log('Goodbye!');
      process.exit();
    }

    console.log(chalk.red('Unrecognized command: ', code));
    replLoop(prompt, code);
  });
};

export const startRepl = () => {
  console.log(welcomePrompt);
  repl(defaultPrompt);
};
