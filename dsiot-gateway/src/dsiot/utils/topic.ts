import { Aspect } from '../models/aspect';
import { DeviceClass } from '../models/device-class';

// schema:
//   dsiot/guid(128)/aspect/class/1
//   dsiot/guid(128)/aspect/class/2
//   dsiot/guid(128)/aspect/class/3
//
// classes:
//   - ms (MyStrom)
//   - ...
//
// aspects:
//   - dat (Live-Daten)
//   - mnf (Manifest)
//   - sta (Status)
export const topic = (guid: string) => (aspect: Aspect) => (deviceClass: DeviceClass) => (id: string) => `dsiot/${guid}/${aspect}/${deviceClass}/${id}`;
