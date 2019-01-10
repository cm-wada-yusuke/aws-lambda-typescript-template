import * as AWS from 'aws-sdk';
import { AttributeMap, QueryInput, UpdateItemInput } from 'aws-sdk/clients/dynamodb';
import { DeviceLocation } from '../../domains/location/device-location';
import { DateUtil } from '../../modules/util/date-util';

const Region = process.env.REGION!;
const NoteDeviceTableName = process.env.NOTE_DEVICE_TABLE_NAME!;
const PagerLimit = process.env.PAGER_LIMIT!;
const DynamoDB = new AWS.DynamoDB({
    apiVersion: '2012-10-08',
    region: Region,
});

export class DeviceDynamodbTable {

    public static updateLocation(deviceLocation: DeviceLocation): Promise<void> {
        const params: UpdateItemInput = {
            TableName: NoteDeviceTableName,
            Key: {endpointId: {S: deviceLocation.location.endpointId}},
            UpdateExpression: [
                'set latitude = :latitude',
                'longitude = :longitude',
                'geoHash5 = :geoHash5',
                'geoHash9 = :geoHash9',
                'dispatchAt = :dispatchAt',
                'deviceToken = :deviceToken',
                'updatedAt = :updatedAt',
            ].join(', '),
            ExpressionAttributeValues: {
                ':latitude': {S: deviceLocation.location.latitude},
                ':longitude': {S: deviceLocation.location.longitude},
                ':geoHash5': {S: deviceLocation.geoHash5()},
                ':geoHash9': {S: deviceLocation.geoHash9()},
                ':dispatchAt': {N: deviceLocation.location.dispatchAt.toMillis().toString()},
                ':deviceToken': {S: deviceLocation.deviceToken()},
                ':updatedAt': {N: DateUtil.jstNow().toMillis().toString()},
            },
        };

        return DynamoDB.updateItem(params).promise()
            .then(() => {
            });
    }

    public static async filterByGeoHash(
        geoHashGsi: string,
        geoHashFilter: string,
        lastEvaluatedKey?: {}): Promise<any> {
        const query: QueryInput = {
            TableName: NoteDeviceTableName,
            IndexName: 'geoHash5-index',
            KeyConditionExpression: 'geoHash5 = :geoHash5',
            FilterExpression: 'begins_with (geoHash9, :geoHashFilter)',
            ExpressionAttributeValues: {
                ':geoHash5': {S: geoHashGsi},
                ':geoHashFilter': {S: geoHashFilter},
            },
            ProjectionExpression: 'endpointId, userId',
            Limit: Number(PagerLimit),
        };

        if (lastEvaluatedKey) {
            query.ExclusiveStartKey = lastEvaluatedKey;
        }

        const response = await DynamoDB.query(query).promise();
        console.log(response);
        if (!response.Items) {
            return {
                endpoints: [],
            };
        } else {
            const endpoints = response.Items!.map((v: AttributeMap) => {
                return {
                    endpointId: v.endpointId.S!,
                    userId: v.userId.S!,
                };
            });
            return {
                endpoints,
                lastEvaluatedKey: response.LastEvaluatedKey,
            };
        }

    }
}
