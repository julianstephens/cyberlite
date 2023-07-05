import { cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
  PAGE_SIZE: num(),
  MAX_TABLE_ROWS: num(),
  VERSION: str({ default: "1.0.0" }),
  NODE_ENV: str({
    default: "development",
    choices: ["development", "test", "production", "staging"],
  }),
});

export default env;
