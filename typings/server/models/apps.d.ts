declare module Chatshier {
    namespace Models {
        interface Apps {
            [appId: string]: App
        }

        interface App extends BaseProperty {
            group_id: string,
            id1: string,
            id2: string,
            name: string,
            secret: string,
            token1: string,
            token2: string,
            type: 'LINE' | 'FACEBOOK' | 'WECHAT' | 'CHATSHIER',
            webhook_id: string,
            gcalendarId: string
        }
    }
}