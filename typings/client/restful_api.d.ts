declare interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        chatshierApp: ChatshierAppAPI,
        messager: MessagerAPI,
        ticket: TicketAPI,
        keywordreply: KeywordreplyAPI,
        calendar: CalendarAPI
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
    insert: (appId: string, userId: string, keywordreplyData: any) => Promise<any>;
    update: (appId: string, keywordreplyId: string, userId: string, keywordreplyData: any) => Promise<any>;
    remove: (appId: string, keywordreplyId: string, userId: string) => Promise<any>;
}

declare abstract class CalendarAPI {
    getAll: (userId: string) => Promise<any>;
    insert: (userId: string, calendarData: any) => Promise<any>;
    update: (calendarId: string, eventId: string, userId: string, calendarData: any) => Promise<any>;
    remove: (calendarId: string, eventId: string, userId: string) => Promise<any>;
}