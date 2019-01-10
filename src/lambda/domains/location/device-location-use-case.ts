import { DeviceDynamodbTable } from '../../infrastructures/device/device-dynamodb-table';
import { DeviceLocation, IDeviceLocation } from './device-location';

export class DeviceLocationUseCase {

    public static update(location: IDeviceLocation): Promise<void> {
        return DeviceDynamodbTable.updateLocation(new DeviceLocation(location));
    }

}
