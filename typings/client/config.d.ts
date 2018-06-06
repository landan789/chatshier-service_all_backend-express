interface Window {
    config: {
        apiKey: string,
        authDomain: string,
        databaseURL: string,
        projectId: string,
        storageBucket: string,
        messagingSenderId: string
    },
    urlConfig: {
        wwwUrl: string,
        port: string,
        index: string,
        terms: string,
        privacy: string,
        webhookUrl: string,
        apiUrl: string
    },
    chatshierConfig: {
        richmenuImageFileMaxSize: number,
        imageFileMaxSize: number,
        videoFileMaxSize: number,
        audioFileMaxSize: number
    }
}

declare const SOCKET_EVENTS = {
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
