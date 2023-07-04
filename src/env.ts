import { cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
  PAGE_SIZE: num(),
  MAX_TABLE_ROWS: num(),
  NODE_ENV: str({ choices: ["development", "test", "production", "staging"] }),
});

export default env;
