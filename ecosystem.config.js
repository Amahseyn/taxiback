const path = require('path');

module.exports = {
  apps: [
    {
      name: 'taxiback',
      script: 'npm',
      args: 'run start',
      cwd: path.resolve(__dirname),
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};

