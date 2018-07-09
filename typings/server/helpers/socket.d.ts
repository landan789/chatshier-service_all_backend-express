interface ChatshierChatSocketBody {
    app_id: string,
    type: string,
    chatroom_id: string,
    chatroom?: Chatshier.Models.Chatroom,
    senderUid: string,
    recipientUid: string,
    consumers?: Chatshier.Models.Consumers,
    messages: ChatshierMessage[]
}

interface ChatshierMessage {
    _id?: string,
    from: 'SYSTEM' | 'LINE' | 'FACEBOOK' | 'CHATSHIER'  | "WECHAT",
    messager_id: string,
    src: any,
    text: string,
    time: Date | number,
    type: string,
    fileName?: string,
    duration?: number
}
