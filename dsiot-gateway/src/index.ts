import { AsyncMqttClient, connectAsync } from 'async-mqtt';
import 'dotenv/config';
import { TtnMessage } from './ttn/models/message';
import { topic } from './dsiot/utils/topic';
import { Aspect } from './dsiot/models/aspect';
import { DeviceClass } from './dsiot/models/device-class';

let ttnClient: AsyncMqttClient;
let dsiotClient: AsyncMqttClient;

const TEAM_GUID = 'a6142cc1-ebe9-45e5-8589-3cedb6e58557';

interface Temperature {
  temperature: number;
}

interface Humidity {
  humidity: number;
}

type SensorTtnMessage = TtnMessage<Temperature & Humidity>;

const teamTopic = topic(TEAM_GUID);

const dataTopic = teamTopic(Aspect.Data);
const manifestTopic = teamTopic(Aspect.Manifest);
const statusTopic = teamTopic(Aspect.Status);

const myStromDataTopic = dataTopic(DeviceClass.MyStrom);
const myStromManifestTopic = manifestTopic(DeviceClass.MyStrom);
const myStromStatusTopic = statusTopic(DeviceClass.MyStrom);

const { TTN_BROKER_URL, TTN_BROKER_USERNAME, TTN_BROKER_PASSWORD, DSIOT_BROKER_URL } = process.env;

async function start() {
  ttnClient = await connectAsync(TTN_BROKER_URL, {
    username: TTN_BROKER_USERNAME,
    password: TTN_BROKER_PASSWORD
  });
  console.log('connected to ttn');

  dsiotClient = await connectAsync(DSIOT_BROKER_URL);
  console.log('connected to dsiot');
}

start();
