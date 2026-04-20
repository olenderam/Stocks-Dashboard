import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subject, defer, timer } from 'rxjs';
import { bufferTime, filter, map, retry, share } from 'rxjs/operators';
import { webSocket, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { WsConnectionStatus, WsMessage, WsPriceUpdateMessage } from '@core/models/stock-ws.model';
import { WS_URL } from '@core/tokens/ws-url.token';

@Injectable({ providedIn: 'root' })
export class StockWsService {
  private readonly wsUrl = inject(WS_URL);

  private readonly reconnectBaseDelayMs = 1000;
  private readonly reconnectMaxDelayMs = 30000;
  private readonly batchTimeMs = 250;
  private readonly batchMaxSize = 50;

  private readonly _connectionStatus = signal<WsConnectionStatus>('disconnected');
  readonly connectionStatus = this._connectionStatus.asReadonly();

  connect(): Observable<WsPriceUpdateMessage> {
    return this.createConnectionStream().pipe(
      this.batchAndNormalizeMessages(),
      share({
        connector: () => new Subject<WsPriceUpdateMessage>(),
        resetOnError: false,
        resetOnComplete: false,
        resetOnRefCountZero: true,
      }),
    );
  }

  private createConnectionStream(): Observable<WsPriceUpdateMessage> {
    return defer(() => {
      let retryAttempt = 0;

      this._connectionStatus.set('connecting');

      return webSocket<WsPriceUpdateMessage>(
        this.createSocketConfig(() => {
          retryAttempt = 0;
        }),
      ).pipe(
        retry({
          delay: (_error, retryCount) => {
            retryAttempt = retryCount;
            this._connectionStatus.set('reconnecting');

            return timer(this.getReconnectDelay(retryAttempt));
          },
          resetOnSuccess: true,
        }),
      );
    });
  }

  private createSocketConfig(
    onConnected: () => void,
  ): WebSocketSubjectConfig<WsPriceUpdateMessage> {
    return {
      url: this.wsUrl,
      openObserver: {
        next: () => {
          onConnected();
          this._connectionStatus.set('connected');
        },
      },
      closeObserver: {
        next: () => {
          this._connectionStatus.set('reconnecting');
        },
      },
    };
  }

  private batchAndNormalizeMessages() {
    return (source: Observable<WsPriceUpdateMessage>): Observable<WsPriceUpdateMessage> =>
      source.pipe(
        filter(
          (message): message is WsPriceUpdateMessage =>
            message.type === WsMessage.PriceUpdate && Array.isArray(message.data),
        ),
        bufferTime(this.batchTimeMs, undefined, this.batchMaxSize),
        filter((messages) => messages.length > 0),
        map((messages) => this.mergeBatchedMessages(messages)),
      );
  }

  private getReconnectDelay(retryAttempt: number): number {
    const attempt = Math.max(retryAttempt, 1);
    const exponentialDelay = this.reconnectBaseDelayMs * Math.pow(2, attempt - 1);

    return Math.min(exponentialDelay, this.reconnectMaxDelayMs);
  }

  private mergeBatchedMessages(messages: WsPriceUpdateMessage[]): WsPriceUpdateMessage {
    const latestById = new Map<number, WsPriceUpdateMessage['data'][number]>();

    for (const message of messages) {
      for (const company of message.data) {
        const previous = latestById.get(company.id);

        latestById.set(company.id, {
          ...(previous ?? {}),
          ...company,
        });
      }
    }

    return {
      type: WsMessage.PriceUpdate,
      data: Array.from(latestById.values()),
    };
  }
}
