module.exports = {
  apps: [{
    name: 'line-bot',
    script: 'src/main.ts',
    interpreter: 'deno',
    interpreterArgs: 'run --allow-net --allow-env --allow-read',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
