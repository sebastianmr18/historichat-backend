export interface IWebSocketNotifier {
  sendToSession(sessionId: string, message: any): Promise<void>;
}