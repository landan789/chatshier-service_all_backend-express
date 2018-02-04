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

    SOCKET_MESSAGE: {
        SEND_MESSAGE_CLIENT_EMIT_SERVER_ON: 'SEND_MESSAGE_CLIENT_EMIT_SERVER_ON',
        SEND_MESSAGE_SERVER_EMIT_CLIENT_ON: 'SEND_MESSAGE_SERVER_EMIT_CLIENT_ON'
    }
}
