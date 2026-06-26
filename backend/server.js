const app = require('./src/app');
const emailWorker = require('./src/queues/email.worker');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Email worker started');
});
