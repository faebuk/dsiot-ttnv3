import { BaseMessage } from './base-message';

export interface JoinMessage extends BaseMessage {
  join_accept: {
    session_key_id: string,
    received_at: string
  };
}
