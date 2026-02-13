// src/infrastructure/websocket/WebSocketServer.ts

import WebSocket, { WebSocketServer as WSServer } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketServer {
  private wss: WSServer;
  private connections: Map<string, WebSocket> = new Map(); // sessionId -> ws

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/live-audio' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    // Generar ID de sesión temporal (luego el caso de uso generará uno definitivo)
    const tempId = uuidv4();
    console.log(`[WebSocket] New connection, assigned temp ID: ${tempId}`);

    // Almacenar conexión con ID temporal (luego se asociará al sessionId real)
    this.connections.set(tempId, ws);

    // Enviar confirmación de conexión
    ws.send(JSON.stringify({ type: 'connected', sessionId: tempId }));

    ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(tempId, data);
    });

    ws.on('close', () => {
      console.log(`[WebSocket] Connection closed for temp ID: ${tempId}`);
      this.connections.delete(tempId);
      // Aquí se debería notificar al caso de uso EndSession
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for temp ID ${tempId}:`, error);
    });
  }

  private handleMessage(tempId: string, data: WebSocket.Data): void {
    // El mensaje puede ser binario (audio) o texto (comandos)
    if (typeof data === 'string') {
      // Comandos JSON (ej. iniciar sesión con instrucciones)
      try {
        const command = JSON.parse(data);
        // Por ahora solo manejamos 'start' para asociar tempId con sessionId real
        if (command.type === 'start') {
          // Reemplazar en el mapa: tempId -> sessionId real
          // Esto se haría después de crear la sesión en StartSession
          console.log(`[WebSocket] Start command received for temp ${tempId}`, command);
        }
      } catch (e) {
        console.error('[WebSocket] Invalid JSON command');
      }
    } else {
      // Datos binarios: audio
      // Reenviar al caso de uso correspondiente (necesitamos saber el sessionId real)
      // Por ahora, asumimos que tempId es el sessionId (simplificación)
      console.log(`[WebSocket] Audio chunk received from ${tempId}, size: ${data.length}`);
      
      // Aquí se llamaría a HandleAudioInput.execute({ sessionId: realId, audioChunk: data })
    }
  }

  // Método público para enviar mensajes a una sesión específica
  public sendToSession(sessionId: string, message: any): void {
    const ws = this.connections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn(`[WebSocket] Cannot send to session ${sessionId}, connection not open`);
    }
  }

  // Método para actualizar el mapping de tempId a sessionId real
  public associateSession(tempId: string, realSessionId: string): void {
    const ws = this.connections.get(tempId);
    if (ws) {
      this.connections.delete(tempId);
      this.connections.set(realSessionId, ws);
      console.log(`[WebSocket] Associated temp ${tempId} -> session ${realSessionId}`);
    }
  }

  // Método para cerrar una sesión
  public closeSession(sessionId: string): void {
    const ws = this.connections.get(sessionId);
    if (ws) {
      ws.close();
      this.connections.delete(sessionId);
    }
  }
}