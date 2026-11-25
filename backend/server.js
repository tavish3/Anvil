const app = require('./src/app');
const emailWorker = require('./src/queues/email.worker');
const aiWorker = require('./src/queues/ai.worker');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Email worker started');
  console.log(aiWorker ? 'AI worker started' : 'AI features disabled (no GEMINI_API_KEY)');
});
