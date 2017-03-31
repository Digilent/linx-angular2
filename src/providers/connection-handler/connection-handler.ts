import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

import { GenericTransportService } from '../transports/generic-transport';
import { HttpTransportService } from '../transports/http-transport';

@Injectable()
export class ConnectionHandlerService {
    public transport: GenericTransportService;
    public transportType: 'http';
    
    constructor() {
        console.log('ConnectionHandlerService constructor');
        this.transport = new HttpTransportService();
    }

    setHttpTransport() {
        this.transport = new HttpTransportService();
        this.transportType = 'http';
    }

}