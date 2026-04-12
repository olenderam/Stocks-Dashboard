import { CompanyBase } from './company.model';

export interface WsCompanyPriceUpdate extends CompanyBase {
  price_net: number;
}

export enum WsMessage {
  PriceUpdate = 'price_update',
}

export interface WsPriceUpdateMessage {
  type: WsMessage.PriceUpdate;
  data: WsCompanyPriceUpdate[];
}

export type WsConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
