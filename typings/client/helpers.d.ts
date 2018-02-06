interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        chatshierApp: ChatshierAppAPI,
        messager: MessagerAPI,
        ticket: TicketAPI,
        keywordreply: KeywordreplyAPI,
        calendar: CalendarAPI,
        tag: TagAPI,
        chatroom: ChatroomAPI
    },
    translate: {
        ready: Promise<{ [key: string]: string }>,
        get: (key: string) => Promise<string>,
        json: () => { [key: string]: string }
    }
}

interface ChatshierAppAPI {
    getAll: (userId: string) => Promise<any>;
}

interface MessagerAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, msgerId: string, userId: string) => Promise<any>;
    update: (appId: string, msgerId: string, userId: string, msgerData: any) => Promise<any>;
}

interface TicketAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, newTicketData: any) => Promise<any>;
    update: (appId: string, ticketId: string, userId: string, modifiedTicketData: any) => Promise<any>;
    remove: (appId: string, ticketId: string, userId: string) => Promise<any>;
}

interface KeywordreplyAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, keywordreplyData: any) => Promise<any>;
    update: (appId: string, keywordreplyId: string, userId: string, keywordreplyData: any) => Promise<any>;
    remove: (appId: string, keywordreplyId: string, userId: string) => Promise<any>;
}

interface CalendarAPI {
    getAll: (userId: string) => Promise<any>;
    insert: (userId: string, calendarData: any) => Promise<any>;
    update: (calendarId: string, eventId: string, userId: string, calendarData: any) => Promise<any>;
    remove: (calendarId: string, eventId: string, userId: string) => Promise<any>;
}

interface TagAPI {
    getAll: (userId: string) => Promise<any>;
    insert: (appId: string, userId: string, tagData: any) => Promise<any>;
    update: (appId: string, tagId: string, userId: string, tagData: any) => Promise<any>;
    remove: (appId: string, tagId: string, userId: string) => Promise<any>;
    enums: {
        type: {
            SYSTEM: 'SYSTEM',
            DEFAULT: 'DEFAULT',
            CUSTOM: 'CUSTOM'
        },
        setsType: {
            TEXT: 'TEXT',
            NUMBER: 'NUMBER',
            DATE: 'DATE',
            SELECT: 'SELECT',
            MULTI_SELECT: 'MULTI_SELECT',
            CHECKBOX: 'CHECKBOX'
        }
    }
}

interface ChatroomAPI {
    getAllMessages: (userId: string) => Promise<any>;
    getAllMessagesByAppId: (appId: string, userId: string) => Promise<any>;
}