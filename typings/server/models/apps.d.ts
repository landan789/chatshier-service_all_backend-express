declare module Chatshier {
    namespace Models {
        interface Apps {
            [appId: string]: App
        }

        interface App {
            _id: any,
            createdTime: Date | Number,
            updatedTime: Date | Number,
            group_id: string,
            id1: string,
            id2: string,
            name: string,
            secret: string,
            token1: string,
            token2: string,
            type: 'LINE' | 'FACEBOOK' | 'WECHAT' | 'CHATSHIER',
            webhook_id: string,
            isDeleted: boolean
        }
    }
}