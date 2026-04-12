import { inject, Injectable, signal } from '@angular/core';
import { WsConnectionStatus, WsMessage, WsPriceUpdateMessage } from '@core/models/stock-ws.model';
import { WS_URL } from '@core/tokens/ws-url.token';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StockWsService {
  private readonly wsUrl = inject(WS_URL);
  private readonly reconnectDelayMs = 3000;

  private readonly _connectionStatus = signal<WsConnectionStatus>('disconnected');

  readonly connectionStatus = this._connectionStatus.asReadonly();

  connect(): Observable<WsPriceUpdateMessage> {
    return new Observable<WsPriceUpdateMessage>((observer) => {
      let socket: WebSocket | null = null;
      let reconnectTimeout: number | null = null;
      let closedByUser = false;
      let hasConnectedAtLeastOnce = false;

      const openConnection = () => {
        this._connectionStatus.set(hasConnectedAtLeastOnce ? 'reconnecting' : 'connecting');

        socket = new WebSocket(this.wsUrl);

        socket.onopen = () => {
          hasConnectedAtLeastOnce = true;
          this._connectionStatus.set('connected');
        };

        socket.onmessage = (event) => {
          const message = this.parseMessage(event.data);

          if (message) {
            observer.next(message);
          }
        };

        socket.onerror = () => {
          // connection error handled by reconnecting mechanism
        };

        socket.onclose = () => {
          if (closedByUser) {
            this._connectionStatus.set('disconnected');
            return;
          }

          this._connectionStatus.set('reconnecting');
          reconnectTimeout = setTimeout(openConnection, this.reconnectDelayMs);
        };
      };

      openConnection();

      return () => {
        closedByUser = true;

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }

        socket?.close();
        this._connectionStatus.set('disconnected');
      };
    });
  }

  private parseMessage(rawData: string): WsPriceUpdateMessage | null {
    try {
      const parsed = JSON.parse(rawData) as Partial<WsPriceUpdateMessage>;

      if (parsed.type === WsMessage.PriceUpdate && Array.isArray(parsed.data)) {
        return parsed as WsPriceUpdateMessage;
      }

      return null;
    } catch {
      return null;
    }
  }
}
