interface Window {
    CHATSHIER: {
        FILE: {
            RICHMENU_IMAGE_MAX_SIZE: number,
            IMAGE_MAX_SIZE: number,
            VIDEO_MAX_SIZE: number,
            AUDIO_MAX_SIZE: number,
            OTHER_MAX_SIZE: number
        },
        FACEBOOK: {
            APP_ID: string,
            COOKIE: boolean,
            XFBML: boolean,
            VERSION: string
        },
        GOOGLE_CALENDAR: {
            API_KEY: string,
            CLIENT_ID: string,
            DISCOVERY_DOCS: string[],
            SCOPES: string
        },
        ONESIGNAL: {
            DEV_CHATSHIER_APPID: string,
            REL_CHATSHIER_APPID: string,
            CHATSHIER_APPID: string,
            DEV_DSDSDS_APPID: string,
            REL_DSDSDS_APPID: string,
            DSDSDS_APPID: string
        },
        URL: {
            WWW: string,
            port: string,
            index: string,
            terms: string,
            privacy: string,
            WEBHOOK: string,
            API: string
        }
    },
    SOCKET_EVENTS: {
        EMIT_MESSAGE_TO_SERVER: 'EMIT_MESSAGE_TO_SERVER',
        EMIT_MESSAGE_TO_CLIENT: 'EMIT_MESSAGE_TO_CLIENT',

        USER_REGISTRATION: 'USER_REGISTRATION',
        READ_CHATROOM_MESSAGES: 'READ_CHATROOM_MESSAGES',

        BROADCAST_MESSAGER_TO_SERVER: 'BROADCAST_MESSAGER_TO_SERVER',
        BROADCAST_MESSAGER_TO_CLIENT: 'BROADCAST_MESSAGER_TO_CLIENT',
        PUSH_COMPOSES_TO_ALL: 'PUSH_COMPOSES_TO_ALL',

        CONSUMER_FOLLOW: 'CONSUMER_FOLLOW',
        CONSUMER_UNFOLLOW: 'CONSUMER_UNFOLLOW',

        USER_ADD_GROUP_MEMBER_TO_SERVER: 'USER_ADD_GROUP_MEMBER_TO_SERVER',
        USER_ADD_GROUP_MEMBER_TO_CLIENT: 'USER_ADD_GROUP_MEMBER_TO_CLIENT',

        USER_REMOVE_GROUP_MEMBER_TO_SERVER: 'USER_REMOVE_GROUP_MEMBER_TO_SERVER',
        USER_REMOVE_GROUP_MEMBER_TO_CLIENT: 'USER_REMOVE_GROUP_MEMBER_TO_CLIENT',

        /**
         * socket.io base event (server only)
         */
        CONNECTION: 'connection',

        /**
         * socket.io base event (client only)
         */
        CONNECT: 'connect',

        /**
         * socket.io base event (client only)
         */
        RECONNECT: 'reconnect',

        /**
         * socket.io base event
         */
        DISCONNECT: 'disconnect'
    }
}
