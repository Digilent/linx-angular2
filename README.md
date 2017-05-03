# linx-angular2
Browser implementation of the LINX library using Angular2. Currently, this library is used in combination with the Digilent Agent to send devices from the browser to the agent and from the agent to the device and back up. Note that your device must already have the LINX firmware flashed.

# Documentation
[What is LINX?](https://www.labviewmakerhub.com/doku.php?id=libraries:linx:start)
[LINX Specification / Documentation](https://www.labviewmakerhub.com/doku.php?id=learn:libraries:linx:spec:start)

## Setting Up

### Install linx-angular2
```
npm install linx-angular2 --save
```

## Usage

#### Import DeviceService And AgentService
Functionality provided by DeviceService and AgentService. In this example, the Digilent Agent will be used to send serial commands.

First, enumerate the USB devices on the system using agent.enumerateDevices(). You can then set the active device with agent.setActiveDevice(port: string). Once a device is added, it can be accessed on the activeDevice property on the agent object. After this, you can call methods on the device object to send commands to the device and receive responses.

```TypeScript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

import { DeviceService } from 'linx-angular2/providers';
import { AgentService } from 'linx-angular2/providers';

@Injectable()
export class DeviceManagerService {
    public device: DeviceService;
    public agent: AgentService;

    constructor() {
        this.agent = new AgentService('http://192.168.1.252:42135');
        this.agent.enumerateDevices()
            .flatMap((data) => {
                console.log(data.agent[0].devices[0]);
                return this.agent.setActiveDevice('COM6');
            })
            .flatMap((data) => {
                console.log(data);
                this.device = this.agent.activeDevice;
                return this.device.sync();
            })
            .flatMap((data) => {
                console.log(data);
                return this.device.getDeviceId();
            })
            .flatMap((data) => {
                console.log(data);
                return this.device.getLinxApiVersion();
            })
            .subscribe(
                (data) => {
                    console.log(data);
                },
                (err) => {
                    console.log(err);
                },
                () => { }
            );
    }
}
```

## License
MIT @ Digilent
