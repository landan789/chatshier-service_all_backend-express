/**
 * https://developers.facebook.com/docs/messenger-platform/webhook
 */
interface FacebookWebhookEventInterface {
    object: 'page',
    entry: FacebookWebhookEntry[],
}

/**
 * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/#entry
 */
interface FacebookWebhookEntry {
    id: string;
    time: number;
    messaging: FacebookMessagingObject[]
}

/**
 * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events#messaging
 */
interface FacebookMessagingObject {
    sender: {
        id: string;
    },
    recipient: {
        id: string;
    },
    timestamp: number,
    message: FacebookMessageEventObject
}

/**
 * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages
 */
interface FacebookMessageEventObject {
    mid: string,
    text: string,
    quick_reply: {
        payload: string
    },
    attachments: {
        type: 'image' | 'fallback' | 'audio' | 'file' | 'image' | 'location' | 'video'
        payload: {
            /** 
             * image, audio, video, file only
             */
            url: string,
            /**
             * location only
             */
            coordinates: {
                lat: number,
                long: number
            }
        },
        /**
         * fallback only
         */
        fallback: {
            title: string,
            url: string,
            payload: null,
            type: string
        }
    }[]
}
