import { BaseMessage } from './base-message';

export interface UpMessage<T> extends BaseMessage {
  uplink_message: {
    session_key_id: string,
    f_port: number,
    f_cnt: number,
    frm_payload: string,
    decoded_payload: T,
    rx_metadata: {
      gateway_ids: {
        gateway_id: string,
        eui: string
      },
      rssi: number,
      snr: number,
      timestamp: number
    }[];
  };
}
