// LINE Messaging API 型別定義

export interface LineWebhookEvent {
  type: string;
  mode: string;
  timestamp: number;
  source: LineEventSource;
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  message?: LineMessage;
  replyToken?: string;
}

export interface LineEventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
  text?: string;
  quoteToken?: string;
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

export interface LineReplyMessage {
  type: 'text';
  text: string;
}

export interface LineReplyRequest {
  replyToken: string;
  messages: LineReplyMessage[];
  notificationDisabled?: boolean;
}

// LINE API 回應型別
export interface LineApiResponse {
  sentMessages?: Array<{
    id: string;
    quoteToken: string;
  }>;
}

// LINE API 錯誤型別
export interface LineApiError {
  message: string;
  details?: Array<{
    message: string;
    property: string;
  }>;
}
