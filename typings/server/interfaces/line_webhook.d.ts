/**
 * https://developers.line.me/en/docs/messaging-api/reference/#webhook-event-objects
 * 
 * @interface LineWebhookEventObject
 */
interface LineWebhookEventInterface {
    events: LineWebhookEventObject[];
}

interface LineWebhookEventObject {
    replyToken: string,
    type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'postback' | 'beacon',
    timestamp: number,
    source: {
        type: 'user' | 'room' | 'group',
        roomId: string,
        groupId: string,
        userId: string
    },
    message: {
        id: string,
        type: 'text' | 'sticker' | 'image' | 'video' | 'audio' | 'location' | 'file',
        text: string,

        /**
         * type sticker
         */
        packageId: string,

        /**
         * type sticker
         */
        stickerId: string

        /**
         * type file
         */
        fileName: string,

        /**
         * type file
         */
        fileSize: number,

        /**
         * type location
         */
        title: string,

        /**
         * type location
         */
        address: string,
        
        /**
         * type location
         */
        latitude: number,
        
        /**
         * type location
         */
        longitude: number
    },
    postback: {
        /**
         * ex: 'storeId=12345'
         */
        data: string,
        params: {
            /**
             * ex: '2017-12-25' (date mode)
             */
            date: string,

            /**
            * ex: '01:00' (time mode)
            */
            time: string,

            /**
            * ex: '2017-12-25T01:00' (datetime mode)
            */
            datetime: string
        }
    },
    beacon: {
        hwid: string,
        type: 'enter'
    }
}

interface LineWebhookMessage {
    type: 'text' | 'sticker' | 'image' | 'video' | 'audio' | 'location';
    /**
     * type: text
     */
    text?: string;

    /**
     * type: sticker
     */
    packageId?: string;

    /**
     * type: sticker
     */
    stickerId?: string;

    /**
     * type: image | video | audio
     */
    originalContentUrl?: string;

    /**
     * type: image | video
     */
    previewImageUrl?: string;

    /**
     * type: audio
     */
    duration?: number;

    /**
     * type: location
     */
    title?: string;

    /**
     * type: location
     */
    address?: string;

    /**
     * type: location
     */
    latitude?: number;

    /**
     * type: location
     */
    longitude?: number;
}