import { AsyncMqttClient, connectAsync } from 'async-mqtt';
import 'dotenv/config';
import { topic } from './dsiot/utils/topic';
import { Aspect } from './dsiot/models/aspect';
import { DeviceClass } from './dsiot/models/device-class';
import * as Buffer from 'buffer';
import { UpMessage } from './ttn/models/up-message';
import { JoinMessage } from './ttn/models/join-message';
import { DataMessage } from './dsiot/models/data-message';
import { StatusMessage } from './dsiot/models/status-message';

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

const MESSAGE_INTERVAL_MS = 6 * 60 * 1000;
const MESSAGE_INTERVAL_OFFSET_MS = 10 * 1000;

const PUBLISH_MANIFEST_INTERVAL = 1000 * 60;
const PUBLISH_STATUS_INTERVAL = 1000 * 30;

// object which defines the last timestamp when we received an
// uplink message from a device
const devicesStatus: { [key: string]: number } = {};

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
  publishManifest();
  publishStatus();

  setInterval(publishManifest, PUBLISH_MANIFEST_INTERVAL);
  setInterval(publishStatus, PUBLISH_STATUS_INTERVAL);

  console.log('ready');
}

async function onTtnMessage(topic: string, buffer: Buffer) {
  const jsonPayload = buffer.toString();
  const payload: UpMessage<Temperature & Humidity> | JoinMessage = JSON.parse(jsonPayload);
  const deviceId = payload.end_device_ids.device_id;

  if (isUplinkPayload(payload)) {
    console.log('uplink received', payload.uplink_message.decoded_payload);
    devicesStatus[deviceId] = getCurrentTimestamp();

    if (!payload.uplink_message.decoded_payload) {
      return;
    }

    await publishData(deviceId, {
      temperature: payload.uplink_message.decoded_payload.temperature,
      humidity: payload.uplink_message.decoded_payload.humidity
    });
  }
}

async function publishManifest() {
  for (const manifest of manifests) {
    const topicName = weatherStationManifestTopic(manifest.instanceId);

    await dsiotClient.publish(topicName, JSON.stringify(manifest));
  }
}

function publishStatus() {
  const currentTimestamp = getCurrentTimestamp();

  for (const device of manifests) {
    const topicName = weatherStationStatusTopic(device.instanceId);

    if (!devicesStatus[device.instanceId]) {
      const message: StatusMessage = {
        online: 0
      };

      dsiotClient.publish(topicName, JSON.stringify(message));
      continue;
    }

    const latestMessageTimestamp = devicesStatus[device.instanceId];
    let online = 0;

    if (latestMessageTimestamp + MESSAGE_INTERVAL_MS + MESSAGE_INTERVAL_OFFSET_MS >= currentTimestamp) {
      online = currentTimestamp;
    }

    const message: StatusMessage = {
      online
    };

    dsiotClient.publish(topicName, JSON.stringify(message));
  }
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

function getCurrentTimestamp(): number {
  return new Date().getTime();
}

start();
