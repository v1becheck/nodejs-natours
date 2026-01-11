const mongoose = require('mongoose');
const dotenv = require('dotenv');
// const https = require('https');
// const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log(err);
  console.log('UNHANDLED EXCEPTION! Shutting down...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<USERNAME>',
  process.env.USERNAME
).replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  // .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferCommands: false, // Disable mongoose buffering
    bufferMaxEntries: 0, // Disable mongoose buffering
  })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('DB connection successful!');
  });

// Generating SelfSigned SSL for local development - (type in tereminal)
// openssl genrsa -out key.pem 2048
// openssl req -new -key key.pem -out csr.pem
// openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem

// SSL Certificates
// const sslServer = https.createServer(
//   {
//     key: fs.readFileSync(path.join(__dirname, 'key.pem')),
//     cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
//   },
//   app
// );

// Start HTTPS server
// sslServer.listen(5001, () => {
//   console.log('Secure server is running on https://localhost:5001');
// });

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`App running on port ${PORT}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully.');
  server.close(() => {
    console.log('Process terminated');
  });
});
