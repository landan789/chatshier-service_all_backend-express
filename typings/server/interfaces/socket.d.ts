interface ChatshierChatSocketBody {
    app_id: string;
    chatroom_id: string;
    senderUid: string;
    recipientUid: string;
    type: string;
    messagers?: any;
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
