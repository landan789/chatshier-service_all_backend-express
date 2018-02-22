module.exports = {
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
};
