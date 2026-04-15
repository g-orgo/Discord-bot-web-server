import { PORT } from './src/config.js';
import { connectDb } from './src/db.js';
import { seedAdmin } from './src/seed.js';
import { createApp } from './src/createApp.js';

const app = createApp();

connectDb()
  .then(async () => {
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`raptor-chatbot-server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[boot] Fatal error:', err.message);
    process.exit(1);
  });
