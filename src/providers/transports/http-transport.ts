import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

import { GenericTransportService } from './generic-transport';

@Injectable()
export class HttpTransportService extends GenericTransportService {
    public start = 0;
    public finish = 0;

    constructor() {
        super();
        console.log('HttpTransportService constructor');
    }

    writeRead(address: string, endpoint: string, data: any, returnType: 'binary' | 'json'): Observable<any> {
        let uri = address + endpoint;
        console.log(uri);
        return Observable.create((observer) => {
            let XHR = new XMLHttpRequest();


            // We define what will happen if the data are successfully sent
            XHR.addEventListener("load", (event: any) => {
                console.log(event.currentTarget.response);
                this.finish = performance.now();
                console.log('FLIGHT TIME: ' + (this.finish - this.start));
                observer.next(event.currentTarget.response);
                observer.complete();
            });

            // We define what will happen in case of error
            XHR.addEventListener("error", (event) => {
                observer.error('TX Error: ', event);
            });

            XHR.addEventListener("timeout", (event) => {
                observer.error('HTTP Timeout: ', event);
            });


            // We set up our request
            try {
                XHR.open("POST", uri);

                XHR.timeout = 5000;

                if (returnType === 'binary') {
                    //Set response type as arraybuffer to receive response as bytes
                    XHR.responseType = 'arraybuffer';
                }
                this.start = performance.now();
                XHR.send(data);
            }
            catch (err) {
                observer.error('TX Error: ', event);
            }
        });
    }


}