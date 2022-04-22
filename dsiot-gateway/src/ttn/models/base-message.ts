export interface BaseMessage {
  end_device_ids: {
    device_id: string,
    application_ids: {
      application_id: string
    },
    dev_eui: string,
    join_eui: string,
    dev_addr: string
  },
  received_at: string
}
