interface ChatshierChatSocketBody {
    app_id: string,
    chatroom_id: string,
    senderUid: string,
    recipientUid: string,
    type: string,
    chatroom?: any,
    consumers?: any,
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