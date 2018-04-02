interface ChatshierChatSocketBody {
    app_id: string;
    chatroom_id: string;
    recipientUid: string;
    type: string;
    messages: ChatshierMessage[]
}

interface ChatshierMessage {
    from: 'LINE' | 'FACEBOOK' | 'CHATSHIER' | 'SYSTEM';
    platformUid?: string;
    messager_id?: string;
    src: any;
    text: string;
    time: number;
    type: string;
}
