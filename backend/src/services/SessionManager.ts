import { ChatSession, ChatMessage } from '../shared-types';
import { v4 as uuidv4 } from 'uuid';

interface SessionStorage {
  saveSession(session: ChatSession): Promise<void>;
  getSession(sessionId: string): Promise<ChatSession | null>;
  updateSession(session: ChatSession): Promise<void>;
}

class LocalSessionStorage implements SessionStorage {
  private sessions: Map<string, ChatSession> = new Map();

  async saveSession(session: ChatSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async updateSession(session: ChatSession): Promise<void> {
    this.sessions.set(session.id, session);
  }
}

export class SessionManager {
  private storage: SessionStorage;

  constructor(storage: SessionStorage = new LocalSessionStorage()) {
    this.storage = storage;
  }

  async createSession(context?: { selectedText?: string; url?: string; title?: string }): Promise<ChatSession> {
    const session: ChatSession = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      context: context || undefined
    };

    await this.storage.saveSession(session);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.storage.getSession(sessionId);
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<ChatSession> {
    const session = await this.storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push(message);
    session.updatedAt = Date.now();

    await this.storage.updateSession(session);
    return session;
  }
}
