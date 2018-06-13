declare module Chatshier {
    namespace Models {
        interface Consumers {
            [platformUid: string]: Consumer
        }

        interface Consumer {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            type: 'LINE' | 'FACEBOOK' | 'WECHAT',
            platformUid: string,
            isDeleted: boolean,
            name: string,
            photo: string,
            photoOriginal: string
        }
    }
}