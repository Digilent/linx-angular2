import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

@Injectable()
export abstract class GenericTransportService {

    constructor() {
        console.log('GenericTransportService constructor');
    }

    abstract writeRead(address: string, endpoint: string, data: any, returnType: 'binary' | 'json');

}