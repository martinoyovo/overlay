import express from 'express';
import cors from 'cors';
import { MockAIAdapter } from './adapters/MockAIAdapter';
import { SessionManager } from './services/SessionManager';
import { ChatService } from './services/ChatService';
import { ChatRequest } from './shared-types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3005', credentials: true }));
app.use(express.json());

// Initialize services
const aiAdapter = new MockAIAdapter();
const sessionManager = new SessionManager();
const chatService = new ChatService(aiAdapter, sessionManager);

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const chatRequest: ChatRequest = req.body;

    if (!chatRequest.prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await chatService.processChatRequest(chatRequest);
    return res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Overlay backend running on port ${PORT}`);
  console.log(`🤖 Using AI adapter: ${aiAdapter.name}`);
});

export default app;
