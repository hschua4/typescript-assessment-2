declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: string;
      DB_PATH: string;
      LOG_LEVEL: string;
      API_TOKEN: string;
    }
  }
}
export {};
