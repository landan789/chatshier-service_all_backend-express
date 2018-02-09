interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        chatshierApp: ChatshierAppAPI,
        messager: MessagerAPI,
        ticket: TicketAPI,
        keywordreply: KeywordreplyAPI,
        calendar: CalendarAPI,
        tag: TagAPI,
        chatroom: ChatroomAPI,
        auth: AuthAPI,
        groupsMembers: GroupsMembersAPI,
        groups: GroupsAPI,
        users: UsersAPI
        composes: ComposesAPI,
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
    getOne: (appId: string, userId: string) => Promise<any>;
    insert: (userId: string, postAppData: any) => Promise<any>;
    update: (appId: string, userId: string, putAppData: any) => Promise<any>;
    remove: (appId: string, userId: string) => Promise<any>;
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
    };
}

interface ChatroomAPI {
    getAllMessages: (userId: string) => Promise<any>;
    getAllMessagesByAppId: (appId: string, userId: string) => Promise<any>;
}

interface AuthAPI {
    getUsers: (userId: string, email?: string) => Promise<any>;
}

interface GroupsMembersAPI {
    getAll: (groupId: string, userId: string) => Promise<any>;
    insert: (groupId: string, userId: string, groupMemberData: any) => Promise<any>;
    update: (groupId: string, memberId: string, userId: string, groupMemberData: any) => Promise<any>;
    remove: (groupId: string, memberId: string, userId: string) => Promise<any>;
    enums: {
        type: {
            OWNER: 'OWNER',
            ADMIN: 'ADMIN',
            WRITE: 'WRITE',
            READ: 'READ'
        }
    };
}

interface GroupsAPI {
    getUserGroups: (userId: string) => Promise<any>;
    insert: (userId: string) => Promise<any>;
    update: (groupId: string, userId: string, groupData: any) => Promise<any>;
}

interface UsersAPI {
    getUser: (userId: string) => Promise<any>;
    update: (userId: string, userData: any) => Promise<any>;

}

interface AutoreplyAPI {
    getAll: (userId: string) => Promise<any>;
    getOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, autoreplyData: any) => Promise<any>;
    update: (appId: string, autoreplyId: string, userId: string, autoreplyData: any) => Promise<any>;
    remove: (appId: string, autoreplyId: string, userId: string) => Promise<any>;
}

interface ComposesAPI {
    findAll: (userId: string) => Promise<any>;
    findOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, composeData: any) => Promise<any>;
    update: (appId: string, composeId: string, userId: string, composeData: any) => Promise<any>;
    remove: (appId: string, composeId: string, userId: string) => Promise<any>;
}