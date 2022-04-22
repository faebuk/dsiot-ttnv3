export interface ManifestMessage {
  instanceId: string,
  location: string,
  fields: DataField[]
}

export type DataField = { type: 'temperature', unit: string, payloadField: string }
  | { type: 'humidity', unit: 'percentage', payloadField: string };
