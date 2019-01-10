import { DateTime } from 'luxon';

class DateTimeFormat {
    public ZonedDateTime: string = 'yyyy/MM/dd HH:mm:ssZZ';
    public YearMonth: string =  'yyyyMM';

    constructor() {
    }
}

export class DateUtil {
    public static DateTimeFormat = new DateTimeFormat();

    public static jstDateTimeOf(iso: string): DateTime {
        return DateTime.fromISO(iso).setZone('Asia/Tokyo');
    }

    public static jstDateTimeFromUnixTimeMillis(unixTimeMillis: number): DateTime {
        return DateTime.fromMillis(unixTimeMillis).setZone('Asia/Tokyo');
    }

    public static jstNow(): DateTime {
        return DateTime.utc().setZone('Asia/Tokyo');
    }
}
