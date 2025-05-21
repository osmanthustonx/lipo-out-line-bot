export interface EnvConfig {
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  OPENAI_API_KEY: string;
  PORT: number;
  NODE_ENV: 'development' | 'production';
}

const defaultConfig: Partial<EnvConfig> = {
  PORT: 3001,
  NODE_ENV: 'development' as const,
};

export const getEnvConfig = (): EnvConfig => {
  const env = Deno.env.toObject();

  const config: EnvConfig = {
    LINE_CHANNEL_SECRET: env.LINE_CHANNEL_SECRET || '',
    LINE_CHANNEL_ACCESS_TOKEN: env.LINE_CHANNEL_ACCESS_TOKEN || '',
    OPENAI_API_KEY: env.OPENAI_API_KEY || '',
    PORT: Number(env.PORT) || defaultConfig.PORT!,
    NODE_ENV: (env.NODE_ENV as EnvConfig['NODE_ENV']) || defaultConfig.NODE_ENV!,
  };

  // 驗證必要的環境變數
  const requiredEnvVars = ['LINE_CHANNEL_SECRET', 'LINE_CHANNEL_ACCESS_TOKEN', 'OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(key => !config[key as keyof EnvConfig]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  return config;
};


export const envConfig = getEnvConfig();