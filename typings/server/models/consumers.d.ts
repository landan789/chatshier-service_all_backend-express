declare module Chatshier {
    namespace Models {
        interface Consumers {
            [platformUid: string]: Consumer
        }

        interface Consumer extends BaseProperty {
            type: 'LINE' | 'FACEBOOK' | 'WECHAT',
            platformUid: string,
            name: string,
            photo: string,
            photoOriginal: string
        }
    }
}