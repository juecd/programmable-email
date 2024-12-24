import { authorize } from './gmail_auth';
import { listLabels } from './gmail_api';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

const app: Express = express();
const port: number = 3000;

// Create HTTP server instance
const server = createServer(app);

// Create WebSocket server instance
const wss = new WebSocketServer({ server });

app.use(express.static('public'));

// Regular HTTP endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  // Send welcome message to client
  ws.send('Welcome to the WebSocket server!');

  // Handle incoming messages
  ws.on('message', async (data: Buffer) => {
    console.log('Received:', data.toString());
    const response = await authorize().then(listLabels);
    ws.send(JSON.stringify(response));
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});