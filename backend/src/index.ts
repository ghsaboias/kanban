import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { setupSocket } from './socket/socketHandler';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);
const _io = setupSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
