import { AsyncMqttClient, connectAsync } from 'async-mqtt';
import 'dotenv/config';
import { topic } from './dsiot/utils/topic';
import { Aspect } from './dsiot/models/aspect';
import { DeviceClass } from './dsiot/models/device-class';
import * as Buffer from 'buffer';
import { UpMessage } from './ttn/models/up-message';
import { JoinMessage } from './ttn/models/join-message';
import { StatusMessage } from './dsiot/models/status-message';
import { DataMessage } from './dsiot/models/data-message';

// TODO without require?
const manifests = require('../data/manifests.json');

const {
  TTN_BROKER_URL,
  TTN_BROKER_USERNAME,
  TTN_BROKER_PASSWORD,
  DSIOT_BROKER_URL,
  DSIOT_BROKER_USERNAME,
  DSIOT_BROKER_PASSWORD,
  DSIOT_TOPIC_ID
} = process.env;

let ttnClient: AsyncMqttClient;
let dsiotClient: AsyncMqttClient;

interface Temperature {
  temperature: number;
}

interface Humidity {
  humidity: number;
}

const teamTopic = topic(DSIOT_TOPIC_ID!);

const dataTopic = teamTopic(Aspect.Data);
const manifestTopic = teamTopic(Aspect.Manifest);
const statusTopic = teamTopic(Aspect.Status);

const weatherStationDataTopic = dataTopic(DeviceClass.WeatherStation);
const weatherStationManifestTopic = manifestTopic(DeviceClass.WeatherStation);
const weatherStationStatusTopic = statusTopic(DeviceClass.WeatherStation);

async function start() {
  ttnClient = await connectAsync(TTN_BROKER_URL, {
    username: TTN_BROKER_USERNAME,
    password: TTN_BROKER_PASSWORD
  });
  ttnClient.on('message', onTtnMessage);

  // await ttnClient.subscribe('v3/bfh-dsiot@ttn/devices/+/join');
  await ttnClient.subscribe('v3/bfh-dsiot@ttn/devices/+/up');

  dsiotClient = await connectAsync(DSIOT_BROKER_URL, {
    username: DSIOT_BROKER_USERNAME,
    password: DSIOT_BROKER_PASSWORD
  });

  // every minute send a new manifest
  await publishManifest();
  setInterval(publishManifest, 1000 * 60);

  console.log('ready');
}

async function onTtnMessage(topic: string, buffer: Buffer) {
  const jsonPayload = buffer.toString();
  const payload: UpMessage<Temperature & Humidity> | JoinMessage = JSON.parse(jsonPayload);
  const deviceId = payload.end_device_ids.device_id;

  if (isUplinkPayload(payload)) {
    console.log('uplink received', payload.uplink_message.decoded_payload);

    await publishStatus(deviceId,
      payload.uplink_message.rx_metadata[0].snr,
      payload.uplink_message.rx_metadata[0].rssi,
      payload.uplink_message.rx_metadata[0].timestamp);

    await publishData(deviceId, {
      temperature: payload.uplink_message.decoded_payload.temperature,
      humidity: payload.uplink_message.decoded_payload.humidity
    });
  }
  // else {
  //   console.log('join received', payload.join_accept);
  //
  //   await publishStatus(deviceId, payload);
  // }
}

async function publishManifest() {
  for (const manifest of manifests) {
    const topicName = weatherStationManifestTopic(manifest.instanceId);

    await dsiotClient.publish(topicName, JSON.stringify(manifest));
  }
}

async function publishStatus(deviceId: string, snr: number, rssi: number, timestamp: number) {
  const topicName = weatherStationStatusTopic(deviceId);

  const message: StatusMessage = {
    instanceId: deviceId,
    snr,
    rssi,
    timestamp
  };

  await dsiotClient.publish(topicName, JSON.stringify(message));
}

async function publishData(deviceId: string, data: object) {
  const topicName = weatherStationDataTopic(deviceId);

  const message: DataMessage = {
    instanceId: deviceId,
    ...data
  };

  await dsiotClient.publish(topicName, JSON.stringify(message));
}

function isUplinkPayload<T>(message: UpMessage<T> | JoinMessage): message is UpMessage<T> {
  return (message as UpMessage<T>).uplink_message !== undefined;
}

start();
