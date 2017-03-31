import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

import { ConnectionHandlerService } from '../connection-handler/connection-handler';

@Injectable()
export class DeviceService {
    private packetNumber: number = 0;
    public connectionHandlerService: ConnectionHandlerService;
    public deviceAddress: string;

    constructor(deviceAddress: string) {
        this.connectionHandlerService = new ConnectionHandlerService();
        this.deviceAddress = deviceAddress;
        console.log('DeviceService constructor');
    }

    /**************************************************************************
    *   Device
    **************************************************************************/
    sync(): Observable<{ statusCode: number, message: string }> {
        let packet = this.generatePacket(this.getPacketSize(), 0);
        return this.genericReturnHandler(packet);
    }

    getDeviceId(): Observable<{ statusCode: number, message: string, deviceFamily: number, deviceId: number }> {
        let packet = this.generatePacket(this.getPacketSize(), 3);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        deviceFamily: data[5],
                        deviceId: data[6]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        deviceFamily: null,
                        deviceId: null
                    });
                },
                () => { }
            );
        });
    }

    getLinxApiVersion(): Observable<{ statusCode: number, message: string, major: number, minor: number, subminor: number, build: number }> {
        let packet = this.generatePacket(this.getPacketSize(), 4);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        major: data[5],
                        minor: data[6],
                        subminor: data[7],
                        build: data[8]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        major: null,
                        minor: null,
                        subminor: null,
                        build: null
                    });
                },
                () => { }
            );
        });
    }

    getMaxBaudRate(): Observable<{ statusCode: number, message: string, baudRate: number }> {
        let packet = this.generatePacket(this.getPacketSize(), 5);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        baudRate: (data[5] & 255) << 24 | (data[6] & 255) << 16 | (data[7] & 255) << 8 | data[8]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        baudRate: null
                    });
                },
                () => { }
            );
        });
    }

    setBaudRate(baudRate: number): Observable<{ statusCode: number, message: string, actualBaud: number }> {
        let commandParams = this.numberAsByteArray(baudRate, 4);
        let packet = this.generatePacket(this.getPacketSize(commandParams), 6, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        actualBaud: (data[4] & 255) << 24 | (data[5] & 255) << 16 | (data[6] & 255) << 8 | data[7]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        actualBaud: null
                    });
                },
                () => { }
            );
        });
    }

    setDeviceUserId(userId: number): Observable<{ statusCode: number, message: string }> {
        let commandParams = this.numberAsByteArray(userId, 2);
        let packet = this.generatePacket(this.getPacketSize(commandParams), 18, commandParams);
        return this.genericReturnHandler(packet);
    }

    getDeviceUserId(): Observable<{ statusCode: number, message: string, userId: number }> {
        let packet = this.generatePacket(this.getPacketSize(), 19);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        userId: (data[5] & 255) << 8 | data[6]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        userId: null
                    });
                },
                () => { }
            );
        });
    }

    getDeviceName(): Observable<{ statusCode: number, message: string, deviceName: string }> {
        let packet = this.generatePacket(this.getPacketSize(), 36);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let deviceName = String.fromCharCode.apply(null, data.slice(5, data.length - 2));
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        deviceName: deviceName
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        deviceName: null
                    });
                },
                () => { }
            );
        });
    }

    /**************************************************************************
    *   Digital
    **************************************************************************/
    digitalWrite(pinNumber, value): Observable<{ statusCode: number, message: string }> {
        return this.digitalWriteAdvanced(1, [pinNumber], [value]);
    }

    digitalWriteAdvanced(numPins: number, pinNumbers: number[], values: boolean[]): Observable<{ statusCode: number, message: string }> {
        if (pinNumbers.length !== values.length) {
            Observable.create((observer) => {
                observer.error({ statusCode: 1, message: 'Invalid write' });
                return;
            });
        }
        let commandParams = new Uint8Array(2 * pinNumbers.length + 1);
        commandParams[0] = numPins & 255;
        for (let i = 0; i < pinNumbers.length; i++) {
            commandParams[i + 1] = pinNumbers[i] & 255;
        }
        for (let i = 0; i < values.length; i++) {
            commandParams[i + 1 + pinNumbers.length] = values[i] ? 1 : 0;
        }
        let packet = this.generatePacket(this.getPacketSize(commandParams), 65, commandParams);
        return this.genericReturnHandler(packet);
    }

    digitalRead(pinNumber: number): Observable<{ statusCode: number, message: string, value: number }> {
        let commandParams = new Uint8Array(1);
        commandParams[0] = pinNumber;
        let packet = this.generatePacket(this.getPacketSize(commandParams), 66, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        value: data[5]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        value: null
                    });
                },
                () => { }
            );
        });
    }

    digitalReadAdvanced(pinNumbers: number[]): Observable<{ statusCode: number, message: string, values: number[] }> {
        let commandParams = new Uint8Array(pinNumbers);
        let packet = this.generatePacket(this.getPacketSize(commandParams), 66, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let returnValues: number[] = [];
                    for (let i = 0; i < data[1] - 6; i++) {
                        returnValues.push(data[i + 5]);
                    }
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        values: returnValues
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        values: null
                    });
                },
                () => { }
            );
        });
    }

    digitalWriteSquareWave(channel: number, frequency: number, duration?: number): Observable<{ statusCode: number, message: string }> {
        let commandParams: Uint8Array = new Uint8Array(9);
        commandParams[0] = channel;
        let frequencyAsU32 = this.numberAsByteArray(frequency, 4);
        let typedDuration = duration == undefined ? new Uint8Array(4) : this.numberAsByteArray(duration, 4);
        commandParams.set(frequencyAsU32, 1);
        commandParams.set(typedDuration, 5);
        let packet = this.generatePacket(this.getPacketSize(commandParams), 67, commandParams);
        return this.genericReturnHandler(packet);
    }

    /**************************************************************************
    *   Analog
    **************************************************************************/
    analogRead(pinNumber: number): Observable<{ statusCode: number, message: string, value: number }> {
        let commandParams = new Uint8Array(1);
        commandParams[0] = pinNumber;
        let packet = this.generatePacket(this.getPacketSize(commandParams), 100, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        value: data[5]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        value: null
                    });
                },
                () => { }
            );
        });
    }

    analogReadAdvanced(pinNumbers: number[]): Observable<{ statusCode: number, message: string, values: number[] }> {
        let commandParams = new Uint8Array(pinNumbers);
        let packet = this.generatePacket(this.getPacketSize(commandParams), 100, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let returnValues: number[] = [];
                    for (let i = 0; i < data[1] - 6; i++) {
                        returnValues.push(data[i + 5]);
                    }
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        values: returnValues
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        values: null
                    });
                },
                () => { }
            );
        });
    }

    analogWrite(pinNumber: number, value: number): Observable<{ statusCode: number, message: string }> {
        return this.analogWriteAdvanced(1, [pinNumber], [value]);
    }

    analogWriteAdvanced(numPins: number, pinNumbers: number[], values: number[]): Observable<{ statusCode: number, message: string }> {
        if (pinNumbers.length !== values.length) {
            Observable.create((observer) => {
                observer.error({ statusCode: 1, message: 'Invalid write' });
                return;
            });
        }
        let commandParams = new Uint8Array(2 * pinNumbers.length + 1);
        commandParams[0] = numPins & 255;
        for (let i = 0; i < pinNumbers.length; i++) {
            commandParams[i + 1] = pinNumbers[i] & 255;
        }
        for (let i = 0; i < values.length; i++) {
            commandParams[i + 1 + pinNumbers.length] = values[i] & 255;
        }
        let packet = this.generatePacket(this.getPacketSize(commandParams), 101, commandParams);
        return this.genericReturnHandler(packet);
    }

    /**************************************************************************
    *   Servo
    **************************************************************************/
    servoGetChannels(): Observable<{ statusCode: number, message: string, channels: number[] }> {
        let packet = this.generatePacket(this.getPacketSize(), 8);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let channels: number[] = [];
                    for (let i = 0; i < data[1] - 6; i++) {
                        channels.push(data[i + 5]);
                    }
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        channels: channels
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        channels: null
                    });
                },
                () => { }
            );
        });
    }

    servoOpen(channels: number[]): Observable<{ statusCode: number, message: string }> {
        let typedChannelNums: Uint8Array = new Uint8Array(channels);
        let packet = this.generatePacket(this.getPacketSize(typedChannelNums), 320, typedChannelNums);
        return this.genericReturnHandler(packet);
    }

    servoSetPulseWidth(channel: number, value: number) {
        return this.servoSetPulseWidthAdvanced(1, [channel], [value]);
    }

    servoSetPulseWidthAdvanced(numChans: number, channels: number[], values: number[]): Observable<{ statusCode: number, message: string }> {
        if (channels.length !== values.length) {
            Observable.create((observer) => {
                observer.error();
                return;
            });
            return;
        }
        let typedChannelNums: Uint8Array = new Uint8Array(channels);
        let typedValuesArray: Uint8Array = new Uint8Array(values.length * 2);
        for (let i = 0, j = 0; i < values.length; j = j + 2, i++) {
            typedValuesArray[j] = (values[i] >> 8) & 255;
            typedValuesArray[j + 1] = values[i] & 255;
        }
        let combinedArray: Uint8Array = new Uint8Array(typedChannelNums.length + typedValuesArray.length + 1);
        combinedArray[0] = numChans & 255;
        combinedArray.set(typedChannelNums, 1);
        combinedArray.set(typedValuesArray, typedChannelNums.length + 1);
        let packet = this.generatePacket(this.getPacketSize(combinedArray), 321, combinedArray);
        return this.genericReturnHandler(packet);
    }

    servoClose(channels: number[]): Observable<{ statusCode: number, message: string }> {
        let typedChannelNums: Uint8Array = new Uint8Array(channels);
        let packet = this.generatePacket(this.getPacketSize(typedChannelNums), 322, typedChannelNums);
        return this.genericReturnHandler(packet);
    }

    /**************************************************************************
    *   SPI
    **************************************************************************/
    spiOpen(channel: number): Observable<{ statusCode: number, message: string }> {
        let typedChannelNum: Uint8Array = new Uint8Array(1);
        typedChannelNum[0] = channel;
        let packet = this.generatePacket(this.getPacketSize(typedChannelNum), 256, typedChannelNum);
        return this.genericReturnHandler(packet);
    }

    spiSetBitOrder(channel: number, bitOrder: 'lsbFirst' | 'msbFirst'): Observable<{ statusCode: number, message: string }> {
        let spiInfo: Uint8Array = new Uint8Array(2);
        spiInfo[0] = channel;
        spiInfo[1] = bitOrder === 'lsbFirst' ? 0 : 1;
        let packet = this.generatePacket(this.getPacketSize(spiInfo), 257, spiInfo);
        return this.genericReturnHandler(packet);
    }

    spiSetClockFrequency(channel: number, targetFrequency: number): Observable<{ statusCode: number, message: string, actualFrequency: number }> {
        let spiInfo: Uint8Array = new Uint8Array(5);
        spiInfo[0] = channel;
        let adjustedTargetFreq = this.numberAsByteArray(targetFrequency, 4);
        spiInfo.set(adjustedTargetFreq, 1);
        let packet = this.generatePacket(this.getPacketSize(spiInfo), 258, spiInfo);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        actualFrequency: data[5] << 24 | data[6] << 16 | data[7] << 8 | data[8]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        actualFrequency: null
                    });
                },
                () => { }
            );
        });
    }

    spiSetMode(channel: number, mode: number): Observable<{ statusCode: number, message: string }> {
        if (mode < 0 || mode > 3) {
            return new Observable((observer) => {
                observer.error({
                    statusCode: 1,
                    message: 'SPI Mode Must Be Between 0 and 3'
                });
                return;
            });
        }
        let spiInfo: Uint8Array = new Uint8Array(2);
        spiInfo[0] = channel;
        spiInfo[1] = mode;
        let packet = this.generatePacket(this.getPacketSize(spiInfo), 259, spiInfo);
        return this.genericReturnHandler(packet);
    }

    spiWriteRead(channel: number, csPin: number, csLogicLevel: 'activeHigh' | 'activeLow', data: number[]): Observable<{ statusCode: number, message: string, data: number[] }> {
        let frameSize = data.length;
        return this.spiWriteReadAdvanced(channel, frameSize, csPin, csLogicLevel, data);
    }

    spiWriteReadAdvanced(channel: number, frameSize: number, csPin: number, csLogicLevel: 'activeHigh' | 'activeLow', data: number[]): Observable<{ statusCode: number, message: string, data: number[] }> {
        let spiInfo: Uint8Array = new Uint8Array(4 + data.length);
        spiInfo[0] = channel;
        spiInfo[1] = frameSize;
        spiInfo[2] = csPin;
        spiInfo[3] = csLogicLevel === 'activeHigh' ? 1: 0;
        let typedDataArray: Uint8Array = new Uint8Array(data);
        spiInfo.set(typedDataArray, 4);
        let packet = this.generatePacket(this.getPacketSize(spiInfo), 263, spiInfo);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let returnData = [];
                    for (let i = 0; i < data[1] - 6; i++) {
                        returnData.push(data[5 + i]);
                    }
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        data: returnData
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        data: null
                    });
                },
                () => { }
            );
        });
    }

    /**************************************************************************
    *   I2C
    **************************************************************************/
    i2cOpen(channel: number): Observable<{ statusCode: number, message: string }> {
        let typedChannelNum: Uint8Array = new Uint8Array(1);
        typedChannelNum[0] = channel;
        let packet = this.generatePacket(this.getPacketSize(typedChannelNum), 224, typedChannelNum);
        return this.genericReturnHandler(packet);
    }

    i2cSetSpeed(channel: number, frequency: number): Observable<{ statusCode: number, message: string, actualFrequency: number }> {
        let i2cInfo: Uint8Array = new Uint8Array(5);
        i2cInfo[0] = channel;
        let adjustedTargetFreq = this.numberAsByteArray(frequency, 4);
        i2cInfo.set(adjustedTargetFreq, 1);
        let packet = this.generatePacket(this.getPacketSize(i2cInfo), 225, i2cInfo);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        actualFrequency: data[5] << 24 | data[6] << 16 | data[7] << 8 | data[8]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        actualFrequency: null
                    });
                },
                () => { }
            );
        });
    }

    i2cRead(channel: number, slaveAddress: number, numBytesToRead: number, timeout: number, eofConfig: 'default' | 'restart' | 'restartNoStop' | 'noStop'): Observable<{ statusCode: number, message: string, data: number[] }> {
        let i2cInfo: Uint8Array = new Uint8Array(6);
        let timeoutAsU16 = this.numberAsByteArray(timeout, 2);
        let eofConfigDict = {
            default: 0,
            restart: 1,
            restartNoStop: 2,
            noStop: 3
        };
        i2cInfo[0] = channel;
        i2cInfo[1] = slaveAddress & 127;
        i2cInfo[2] = numBytesToRead & 255;
        i2cInfo.set(timeoutAsU16, 3);
        i2cInfo[5] = eofConfigDict[eofConfig] || 0;
        let packet = this.generatePacket(this.getPacketSize(i2cInfo), 227, i2cInfo);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let returnData: number[] = [];
                    for (let i = 0; i < data[1] - 6; i++) {
                        returnData.push(data[i + 5]);
                    }
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        data: returnData
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        data: null
                    });
                },
                () => { }
            );
        });
    }

    i2cWrite(channel: number, slaveAddress: number, eofConfig: number, data: number[]): Observable<{ statusCode: number, message: string }> {
        let i2cInfo: Uint8Array = new Uint8Array(3 + data.length);
        let eofConfigDict = {
            default: 0,
            restart: 1,
            restartNoStop: 2,
            noStop: 3
        };
        i2cInfo[0] = channel;
        i2cInfo[1] = slaveAddress & 127;
        i2cInfo[2] = eofConfigDict[eofConfig] || 0;
        i2cInfo.set(new Uint8Array(data), 3);
        let packet = this.generatePacket(this.getPacketSize(i2cInfo), 226, i2cInfo);
        return this.genericReturnHandler(packet);
    }

    i2cClose(channel: number): Observable<{ statusCode: number, message: string }> {
        let i2cInfo: Uint8Array = new Uint8Array(1);
        i2cInfo[0] = channel;
        let packet = this.generatePacket(this.getPacketSize(i2cInfo), 228, i2cInfo);
        return this.genericReturnHandler(packet);
    }

    /**************************************************************************
    *   PWM
    **************************************************************************/
    pwmSetDutyCycle(pinNumber: number, dutyCycle: number): Observable<{ statusCode: number, message: string }> {
        return this.pwmSetDutyCycleAdvanced(1, [pinNumber], [dutyCycle]);
    }

    pwmSetDutyCycleAdvanced(numPins: number, pinNumbers: number[], dutyCycles: number[]): Observable<{ statusCode: number, message: string }> {
        if (pinNumbers.length !== dutyCycles.length) {
            return Observable.create((observer) => {
                observer.error();
                return;
            });
        }
        let pwmInfo: Uint8Array = new Uint8Array(1 + pinNumbers.length * 2);
        let typedPinNumbersArray: Uint8Array = new Uint8Array(pinNumbers);
        let typedDutyCyclesArray: Uint8Array = new Uint8Array(dutyCycles);
        pwmInfo[0] = numPins & 255;
        pwmInfo.set(typedPinNumbersArray, 1);
        pwmInfo.set(typedDutyCyclesArray, 1 + typedPinNumbersArray.length);
        let packet = this.generatePacket(this.getPacketSize(pwmInfo), 131, pwmInfo);
        return this.genericReturnHandler(packet);
    }

    pwmSetFrequencyAdvanced(numPins: number, pinNumbers: number[], frequencies: number[]): Observable<{ statusCode: number, message: string }> {
        if (pinNumbers.length !== frequencies.length) {
            return Observable.create((observer) => {
                observer.error();
                return;
            });
        }
        let pwmInfo: Uint8Array = new Uint8Array(1 + pinNumbers.length + 4 * frequencies.length);
        let typedPinNumbersArray: Uint8Array = new Uint8Array(pinNumbers);
        let typedFrequenciesArray: Uint8Array = new Uint8Array(4 * frequencies.length);
        pwmInfo[0] = numPins & 255;
        pwmInfo.set(typedPinNumbersArray, 1);
        for (let i = 0; i < typedFrequenciesArray.length; i++) {
            let frequencyAsU32 = this.numberAsByteArray(frequencies[i], 4);
            typedFrequenciesArray.set(frequencyAsU32, (4 * i) + 2);
        }
        let packet = this.generatePacket(this.getPacketSize(pwmInfo), 130, pwmInfo);
        return this.genericReturnHandler(packet);
    }

    /**************************************************************************
    *   UART
    **************************************************************************/
    uartOpen(channel: number, baud: number): Observable<{ statusCode: number, message: string, actualBaud: number }> {
        let uartInfo: Uint8Array = new Uint8Array(5);
        uartInfo[0] = channel;
        let adjustedBaud = this.numberAsByteArray(baud, 4);
        uartInfo.set(adjustedBaud, 1);
        let packet = this.generatePacket(this.getPacketSize(uartInfo), 192, uartInfo);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        actualBaud: data[5] << 24 | data[6] << 16 | data[7] << 8 | data[8]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        actualBaud: null
                    });
                },
                () => { }
            );
        });
    }

    uartSetBaudRate(channel: number, baud: number): Observable<{ statusCode: number, message: string, actualBaud: number }> {
        let uartInfo: Uint8Array = new Uint8Array(5);
        uartInfo[0] = channel;
        let adjustedBaud = this.numberAsByteArray(baud, 4);
        uartInfo.set(adjustedBaud, 1);
        let packet = this.generatePacket(this.getPacketSize(uartInfo), 192, uartInfo);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        actualBaud: data[5] << 24 | data[6] << 16 | data[7] << 8 | data[8]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        actualBaud: null
                    });
                },
                () => { }
            );
        });
    }

    uartGetBytesAvailable(channel: number): Observable<{ statusCode: number, message: string, numBytes: number }> {
        let commandParams = new Uint8Array(1);
        commandParams[0] = channel;
        let packet = this.generatePacket(this.getPacketSize(commandParams), 194, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        numBytes: data[5]
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        numBytes: null
                    });
                },
                () => { }
            );
        }); 
    }

    uartRead(channel: number, numBytes: number): Observable<{ statusCode: number, message: string, data: number[] }> {
        let commandParams = new Uint8Array(2);
        commandParams[0] = channel;
        commandParams[1] = numBytes;
        let packet = this.generatePacket(this.getPacketSize(commandParams), 195, commandParams);
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    let returnData: number[] = [];
                    for (let i = 0; i < data[1] - 6; i++) {
                        returnData.push(data[i + 5]);
                    }
                    observer.next({
                        statusCode: 0,
                        message: 'ok',
                        data: returnData
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err,
                        data: null
                    });
                },
                () => { }
            );
        }); 
    }

    uartWrite(channel: number, data: number[]): Observable<{ statusCode: number, message: string }> {
        let uartInfo: Uint8Array = new Uint8Array(1 + data.length);
        uartInfo[0] = channel;
        let typedData: Uint8Array = new Uint8Array(data);
        uartInfo.set(typedData, 1);
        let packet = this.generatePacket(this.getPacketSize(uartInfo), 196, uartInfo);
        return this.genericReturnHandler(packet);
    }

    uartClose(channel: number): Observable<{ statusCode: number, message: string }> {
        let typedChannelNum: Uint8Array = new Uint8Array(1);
        typedChannelNum[0] = channel;
        let packet = this.generatePacket(this.getPacketSize(typedChannelNum), 197, typedChannelNum);
        return this.genericReturnHandler(packet);
    }

    /**************************************************************************
    *   Utilities
    **************************************************************************/
    private sendPacketAndParseResponse(packet: Uint8Array): Observable<any> {
        console.log('sending packet: ');
        console.log(packet);
        this.packetNumber++;
        return new Observable((observer) => {
            this.connectionHandlerService.transport.writeRead(this.deviceAddress, '/', packet, 'binary').subscribe(
                (data) => {
                    data = new Uint8Array(data);
                    console.log(data);
                    let checksum = this.generateChecksum(data);
                    if (checksum !== data[data.length - 1]) {
                        observer.error('Invalid checksum');
                        return;
                    }
                    if (data[0] !== 255) {
                        observer.error('Invalid first byte');
                        return;
                    }
                    if (data.length !== data[1]) {
                        observer.error('Invalid packet size');
                        return;
                    }
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

    private getPacketSize(commandParams?: Uint8Array) {
        if (commandParams == undefined) {
            return 7;
        }
        return 7 + commandParams.length;
    }

    private generatePacket(packetSize: number, commandNumber: number, commandParams?: Uint8Array) {
        let packet: Uint8Array = new Uint8Array(packetSize);
        packet[0] = parseInt('0xFF');
        packet[1] = packetSize;
        let packetNumberByteArray: Uint8Array = this.numberAsByteArray(this.packetNumber, 2);
        packet[2] = packetNumberByteArray[0];
        packet[3] = packetNumberByteArray[1];
        let commandNumberByteArray: Uint8Array = this.numberAsByteArray(commandNumber, 2);
        packet[4] = commandNumberByteArray[0];
        packet[5] = commandNumberByteArray[1];
        if (commandParams != undefined) {
            for (let i = 0; i < commandParams.length; i++) {
                packet[i + 6] = commandParams[i];
            }
        }
        packet[packetSize - 1] = this.generateChecksum(packet);
        return packet;
    }

    private numberAsByteArray(number, numBytes): Uint8Array {
        let byteArray = new Uint8Array(numBytes);
        for (let i = 0; i < numBytes; i++) {
            byteArray[i] = (number >> (8 * (numBytes - i - 1))) & 255;
        }
        return byteArray;
    }

    private generateChecksum(commandArray: Uint8Array) {
        let checksum = 0;
        let maxVal = Math.pow(2, 8);
        for (let i = 0; i < commandArray.length - 1; i++) {
            checksum += commandArray[i];
        }
        return checksum % maxVal;
    }

    private genericReturnHandler(packet: Uint8Array): Observable<{ statusCode: number, message: string }> {
        return Observable.create((observer) => {
            this.sendPacketAndParseResponse(packet).subscribe(
                (data) => {
                    observer.next({
                        statusCode: 0,
                        message: 'ok'
                    });
                    observer.complete();
                },
                (err) => {
                    observer.error({
                        statusCode: 1,
                        message: err
                    });
                },
                () => { }
            );
        });
    }

}