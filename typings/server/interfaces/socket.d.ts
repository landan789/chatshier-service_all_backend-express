interface ChatshierChatSocketInterface {
    appId: string;
    chatroomId: string;
    messagerId: string;
    appType: string;
    message: ChatshierMessageInterface
}

interface ChatshierMessageInterface {
    from: 'LINE' | 'FACEBOOK' | 'CHATSHIER' | 'SYSTEM';
    messager_id: string;
    src?: any;
    text: string;
    time: number;
    type: string;
}
