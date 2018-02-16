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
        imageFileMaxSize: number,
        videoFileMaxSize: number,
        audioFileMaxSize: number
    }
}

declare const SOCKET_EVENTS = {
    EMIT_MESSAGE_TO_SERVER: 'EMIT_MESSAGE_TO_SERVER',
    EMIT_MESSAGE_TO_CLIENT: 'EMIT_MESSAGE_TO_CLIENT',

    APP_REGISTRATION: 'APP_REGISTRATION',
    READ_CHATROOM_MESSAGES: 'READ_CHATROOM_MESSAGES',

    UPDATE_MESSAGER_TO_SERVER: 'UPDATE_MESSAGER_TO_SERVER',
    UPDATE_MESSAGER_TO_CLIENT: 'UPDATE_MESSAGER_TO_CLIENT',

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
