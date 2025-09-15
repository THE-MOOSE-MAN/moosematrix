module.exports = {
  apps: [
    {
      name: "moosematrix",
      cwd: "apps/moosematrix", // run inside the app folder
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
        // .env will provide the rest (DATABASE_URL, Stripe, etc.)
      },
      watch: false,
      autorestart: true,
      max_restarts: 10
    }
  ]
};
