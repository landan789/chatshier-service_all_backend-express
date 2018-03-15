interface ChatshierChatSocketBody {
    app_id: string;
    chatroom_id: string;
    recipientId: string;
    type: string;
    messages: ChatshierMessage[]
}

interface ChatshierMessage {
    from: 'LINE' | 'FACEBOOK' | 'CHATSHIER' | 'SYSTEM';
    messager_id: string;
    src: any;
    text: string;
    time: number;
    type: string;
}
