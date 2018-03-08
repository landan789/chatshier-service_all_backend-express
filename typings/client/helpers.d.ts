interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        apps: AppAPI,
        appsAutoreplies: AppsAutorepliesAPI,
        appsChatroomsMessages: AppsChatroomsMessagesAPI,
        appsComposes: AppsComposesAPI,
        appsGreetings: AppsGreetingsAPI,
        appsMessagers: AppsMessagersAPI,
        appsKeywordreplies: AppsKeywordrepliesAPI,
        appsTags: AppsTagsAPI,
        appsTickets: AppsTicketsAPI,
        calendarsEvents: CalendarsEventsAPI,
        authentications: AuthenticationsAPI,
        groupsMembers: GroupsMembersAPI,
        groups: GroupsAPI,
        users: UsersAPI
    },
    translate: {
        ready: Promise<{ [key: string]: string }>,
        get: (key: string) => Promise<string>,
        json: () => { [key: string]: string }
    },
    chatshierCookie: {
        CHSR_COOKIE: {
            USER_EMAIL: '_chsr_email',
            USER_NAME: '_chsr_username'
        },
        manager: {
            setCookie: (name: string, val: string, expires: string, domain: string) => boolean,
            getCookie: (name: string) => string,
            deleteCookie: (name: string) => string
        }
    }
}

interface AppAPI {
    findAll: (userId: string) => Promise<any>;
    findOne: (appId: string, userId: string) => Promise<any>;
    insert: (userId: string, postAppData: any) => Promise<any>;
    update: (appId: string, userId: string, putAppData: any) => Promise<any>;
    remove: (appId: string, userId: string) => Promise<any>;
    enums: {
        type: {
            SYSTEM: 'SYSTEM',
            CHATSHIER: 'CHATSHIER',
            LINE: 'LINE',
            FACEBOOK: 'FACEBOOK'
        }
    };
}

interface AppsAutorepliesAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, autoreplyData: any) => Promise<any>;
    update: (appId: string, autoreplyId: string, userId: string, autoreplyData: any) => Promise<any>;
    remove: (appId: string, autoreplyId: string, userId: string) => Promise<any>;
}

interface AppsChatroomsMessagesAPI {
    findAll: (userId: string) => Promise<any>;
}

interface AppsComposesAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, composeData: any) => Promise<any>;
    update: (appId: string, composeId: string, userId: string, composeData: any) => Promise<any>;
    remove: (appId: string, composeId: string, userId: string) => Promise<any>;
}

interface AppsGreetingsAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, greetingData: any) => Promise<any>;
    remove: (appId: string, greetingId: string, userId: string) => Promise<any>;
}

interface AppsMessagersAPI {
    findAll: (userId: string) => Promise<any>;
    findOne: (appId: string, msgerId: string, userId: string) => Promise<any>;
    update: (appId: string, msgerId: string, userId: string, msgerData: any) => Promise<any>;
}

interface AppsKeywordrepliesAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, keywordreplyData: any) => Promise<any>;
    update: (appId: string, keywordreplyId: string, userId: string, keywordreplyData: any) => Promise<any>;
    remove: (appId: string, keywordreplyId: string, userId: string) => Promise<any>;
}

interface AppsTagsAPI {
    findAll: (userId: string) => Promise<any>;
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

interface AppsTicketsAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, newTicketData: any) => Promise<any>;
    update: (appId: string, ticketId: string, userId: string, modifiedTicketData: any) => Promise<any>;
    remove: (appId: string, ticketId: string, userId: string) => Promise<any>;
}

interface CalendarsEventsAPI {
    findAll: (userId: string) => Promise<any>;
    insert: (userId: string, calendarData: any) => Promise<any>;
    update: (calendarId: string, eventId: string, userId: string, calendarData: any) => Promise<any>;
    remove: (calendarId: string, eventId: string, userId: string) => Promise<any>;
}

interface AuthenticationsAPI {
    findUsers: (userId: string, email?: string) => Promise<any>;
    searchUsers: (userId: string, email?: string) => Promise<any>;
}

interface GroupsMembersAPI {
    findAll: (groupId: string, userId: string) => Promise<any>;
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
    findAll: (userId: string) => Promise<any>;
    insert: (userId: string) => Promise<any>;
    update: (groupId: string, userId: string, groupData: any) => Promise<any>;
}

interface UsersAPI {
    findOne: (userId: string) => Promise<any>;
    update: (userId: string, userData: any) => Promise<any>;
}
