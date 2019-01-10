import { DateTime } from 'luxon';
import * as GeoHash from 'ngeohash';

export class DeviceLocation {

    public location: IDeviceLocation;

    constructor(location: IDeviceLocation) {
        this.location = location;
    }

    public geoHash9(): string {
        return GeoHash.encode(this.location.latitude, this.location.longitude, 9);
    }

    public geoHash5(): string {
        return GeoHash.encode(this.location.latitude, this.location.longitude, 5);
    }

    public deviceToken(): string {
        const t = this.location.deviceToken;
        return t ? t : 'empty';
    }

}

export interface IDeviceLocation {
    endpointId: string;
    latitude: string;
    longitude: string;
    dispatchAt: DateTime;
    deviceToken?: string;
}
