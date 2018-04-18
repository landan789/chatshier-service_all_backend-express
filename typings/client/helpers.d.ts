interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        apps: AppAPI,
        appsAutoreplies: AppsAutorepliesAPI,
        appsChatrooms: AppsChatroomsAPI,
        appsChatroomsMessagers: AppsChatroomsMessagersAPI,
        appsComposes: AppsComposesAPI,
        appsGreetings: AppsGreetingsAPI,
        appsKeywordreplies: AppsKeywordrepliesAPI,
        appsTemplates: AppsTemplatesAPI,
        appsRichmenus: AppsRichmenusAPI,
        appsFields: AppsFieldsAPI,
        appsTickets: AppsTicketsAPI,
        calendarsEvents: CalendarsEventsAPI,
        consumers: ConsumersAPI,
        groupsMembers: GroupsMembersAPI,
        groups: GroupsAPI,
        users: UsersAPI,
        sign: SignAPI,
        bot: BotAPI
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

interface AppsChatroomsAPI {
    findAll: (userId: string) => Promise<any>;
}

interface AppsChatroomsMessagersAPI {
    findAll: (userId: string) => Promise<any>;
    findOne: (appId: string, chatroomId: string, messagerId: string, userId: string) => Promise<any>;
    update: (appId: string, chatroomId: string, messagerId: string, userId: string, messager: any) => Promise<any>;
    updateByPlatformUid: (appId: string, chatroomId: string, platformUid: string, userId: string, messager: any) => Promise<any>;
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

interface AppsKeywordrepliesAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, keywordreplyData: any) => Promise<any>;
    update: (appId: string, keywordreplyId: string, userId: string, keywordreplyData: any) => Promise<any>;
    remove: (appId: string, keywordreplyId: string, userId: string) => Promise<any>;
}

interface AppsTemplatesAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    findOne: (appId: string, templateId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, templateData: any) => Promise<any>;
    update: (appId: string, templateId: string, userId: string, templateData: any) => Promise<any>;
    remove: (appId: string, templateId: string, userId: string) => Promise<any>;
}

interface AppsRichmenusAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    findOne: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, richmenuData: any) => Promise<any>;
    update: (appId: string, richmenuId: string, userId: string, richmenuData: any) => Promise<any>;
    remove: (appId: string, richmenuId: string, userId: string) => Promise<any>;
}

interface AppsFieldsAPI {
    findAll: (userId: string) => Promise<any>;
    insert: (appId: string, userId: string, field: any) => Promise<any>;
    update: (appId: string, fieldId: string, userId: string, field: any) => Promise<any>;
    remove: (appId: string, fieldId: string, userId: string) => Promise<any>;
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

interface ConsumersAPI {
    findAll: (userId: string) => Promise<any>;
    findOne: (platformUid: string, userId: string) => Promise<any>;
    update: (platformUid: string, userId: string, consumer: any) => Promise<any>;
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
    insert: (userId: string, group: any) => Promise<any>;
    update: (groupId: string, userId: string, group: any) => Promise<any>;
}

interface UsersAPI {
    find: (userId: string, email?: string, useFuzzy = false) => Promise<any>;
    update: (userId: string, userData: any) => Promise<any>;
}

interface SignAPI {
    refresh: (userId: string) => Promise<any>;
    signOut: () => Promise<any>;
}

interface BotAPI {
    getRichMenuList: (appId: string) => Promise<any>;
    getRichMenu: (appId: string, richmenuId: string) => Promise<any>;
    getRichMenuImage: (appId: string, richmenuId: string) => Promise<any>;
    createRichMenu: (appId: string, richmenuIdData: any) => Promise<any>;
    setRichMenuImage: (appId: string, richmenuId: string, richmenuImg: string) => Promise<any>;
    linkRichMenuToUser: (appId: string, richmenuId: string, senderId: string) => Promise<any>;
    deleteRichMenu: (appId: string, richmenuId: string) => Promise<any>;
    unlinkRichMenuFromUser: (appId: string, richmenuId: string, senderId: string) => Promise<any>;
}
