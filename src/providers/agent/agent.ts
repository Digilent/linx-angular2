import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

import { ConnectionHandlerService } from '../connection-handler/connection-handler';
import { DeviceService } from '../device/device';

@Injectable()
export class AgentService {
    public agentAddress: string;
    public connectionHandlerService: ConnectionHandlerService;
    public devices: DeviceService[] = [];
    public activeDevice: DeviceService;
    public activeDeviceIndex: number;

    constructor(agentAddress: string) {
        console.log('AgentService constructor');
        this.connectionHandlerService = new ConnectionHandlerService();
        if (agentAddress.indexOf('http://') === -1 && agentAddress.indexOf('https://') === -1) {
            this.agentAddress = 'http://' + agentAddress;
        }
        else {
            this.agentAddress = agentAddress;
        }
    }

    private genericResponseHandler(endpoint: string, commandObject: any) {
        return Observable.create((observer) => {
            this.connectionHandlerService.transport.writeRead(this.agentAddress, endpoint, JSON.stringify(commandObject), 'json').subscribe(
                (jsonString) => {
                    let data;
                    try {
                        data = JSON.parse(jsonString);
                    }
                    catch (e) {
                        observer.error(e);
                        return;
                    }
                    if (data == undefined || data.agent == undefined) {
                        observer.error(data);
                        return;
                    }
                    data.agent.forEach((val, index, array) => {
                        if (val.statusCode == undefined || val.statusCode !== 0) {
                            observer.error(data);
                            return;
                        }
                    });
                    observer.next(data);
                    //Handle device errors and warnings
                    observer.complete();
                },
                (err) => {
                    observer.error(err);
                },
                () => {
                    observer.complete();
                }
            )
        });
    }

    enumerateDevices(): Observable<any> {
        let command = {
            agent: [
                {
                    command: 'enumerateDevices'
                }
            ]
        };
        return this.genericResponseHandler('/config', command);
    }

    getAgentInfo(): Observable<any> {
        let command = {
            agent: [
                {
                    command: "getInfo"
                }
            ]
        };
        return this.genericResponseHandler('/config', command);
    }

    getActiveDevice(): Observable<any> {
        let command = {
            agent: [
                {
                    command: "getActiveDevice"
                }
            ]
        };
        return this.genericResponseHandler('/config', command);
    }

    setActiveDevice(device: string): Observable<any> {
        let command = {
            agent: [
                {
                    command: "setActiveDevice",
                    device: device
                }
            ]
        };
        return Observable.create((observer) => {
            this.genericResponseHandler('/config', command).subscribe(
                (data) => {
                    this.devices.push(new DeviceService(this.agentAddress));
                    this.activeDeviceIndex = this.devices.length - 1;
                    this.activeDevice = this.devices[this.activeDeviceIndex];
                    observer.next(data);
                    observer.complete();
                },
                (err) => {
                    observer.error(err);
                },
                () => { }
            );
        });
    }

    releaseActiveDevice(): Observable<any> {
        let command = {
            agent: [
                {
                    command: "releaseActiveDevice"
                }
            ]
        };
        return this.genericResponseHandler('/config', command);
    }

}