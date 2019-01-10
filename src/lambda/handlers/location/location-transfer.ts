import 'source-map-support/register';
import { IDeviceLocation } from '../../domains/location/device-location';
import { DeviceLocationUseCase } from '../../domains/location/device-location-use-case';
import { DateUtil } from '../../modules/util/date-util';

exports.transfer = async (event: any) => {

    const dispatchPromises = event.Records.map((record: any) => {
        const payloadString = new Buffer(record.kinesis.data, 'base64').toString('utf-8');
        const payload = JSON.parse(payloadString);
        console.log(payload);
        return LocationTransferController.update(payload);
    });
    return Promise.all(dispatchPromises);
};

export class LocationTransferController {

    public static update(payload: any): Promise<void> {
        const location = LocationTransferController.convertPayloadToUserLocation(payload);
        console.log(location);
        return DeviceLocationUseCase.update(location).catch((error) => {
            Error.captureStackTrace(error);
            console.log(error.stack);
        });
    }

    private static convertPayloadToUserLocation(payload: any): IDeviceLocation {
        return {
            endpointId: payload.endpointId!,
            latitude: payload.latitude!,
            longitude: payload.longitude!,
            dispatchAt: DateUtil.jstDateTimeFromUnixTimeMillis(payload.date!),
            deviceToken: payload.deviceToken,
        };
    }
}
