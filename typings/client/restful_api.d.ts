declare interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        chatshierApp: ChatshierAppAPI,
        messager: MessagerAPI,
        ticket: TicketAPI,
        keywordreply: KeywordreplyAPI
    }
}

declare abstract class ChatshierAppAPI {
    getAll: (userId: string) => Promise<any>;
}

declare abstract class MessagerAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, userId: string) => Promise<any>;
}

declare abstract class TicketAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, newTicketData: any) => Promise<any>;
    update: (appId: string, ticketId: string, userId: string, modifiedTicketData: any) => Promise<any>;
    remove: (appId: string, ticketId: string, userId: string) => Promise<any>;
}

declare abstract class KeywordreplyAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, newKeywordreplyData: any) => Promise<any>;
    update: (appId: string, KeywordreplyId: string, userId: string, modifiedKeywordreplyData: any) => Promise<any>;
    remove: (appId: string, KeywordreplyId: string, userId: string) => Promise<any>;
}