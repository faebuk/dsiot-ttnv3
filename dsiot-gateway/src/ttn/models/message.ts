// not all attributes
export interface TtnMessage<T> {
  end_device_ids: {
    device_id: string,
    application_ids: {
      application_id: string
    },
    dev_eui: string,
    join_eui: string,
    dev_addr: string
  },
  received_at: string,
  uplink_message: {
    session_key_id: string,
    f_port: number,
    f_cnt: number,
    frm_payload: string,
    decoded_payload: T
  }
}
