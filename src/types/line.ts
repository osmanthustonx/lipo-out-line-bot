export interface LineEvent {
  type: 'message' | 'follow' | 'memberJoined';
  message?: {
    type: 'text' | 'image';
    id: string;
    text?: string;
  };
  source: {
    type: 'user' | 'group';
    userId: string;
    groupId?: string;
  };
  replyToken: string;
  joined?: {
    members: Array<{
      userId: string;
    }>;
  };
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineConfig {
  channelSecret: string;
  channelAccessToken: string;
}
