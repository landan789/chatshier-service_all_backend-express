interface ChatshierChatSocketInterface {
    appId: string;
    chatroomId: string;
    recipientId: string;
    appType: string;
    messages: ChatshierMessageInterface[]
}

interface ChatshierMessageInterface {
    from: 'LINE' | 'FACEBOOK' | 'CHATSHIER' | 'SYSTEM';
    messager_id: string;
    src?: any;
    text: string;
    time: number;
    type: string;
    contents?: any;
    name: string;
}
