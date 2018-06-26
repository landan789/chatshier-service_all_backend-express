interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        apps: AppAPI,
        appsAutoreplies: AppsAutorepliesAPI,
        appsAppointments: AppsAppointmentsAPI,
        appsChatrooms: AppsChatroomsAPI,
        appsChatroomsMessagers: AppsChatroomsMessagersAPI,
        appsComposes: AppsComposesAPI,
        appsGreetings: AppsGreetingsAPI,
        appsKeywordreplies: AppsKeywordrepliesAPI,
        appsTemplates: AppsTemplatesAPI,
        appsRichmenus: AppsRichmenusAPI,
        appsFields: AppsFieldsAPI,
        appsTickets: AppsTicketsAPI,
        bot: BotAPI,
        calendarsEvents: CalendarsEventsAPI,
        consumers: ConsumersAPI,
        groupsMembers: GroupsMembersAPI,
        groups: GroupsAPI,
        users: UsersAPI,
        sign: SignAPI
    };

    translate: {
        ready: Promise<{ [key: string]: string }>,
        get: (key: string) => Promise<string>,
        json: () => { [key: string]: string }
    };

    chatshierCookie: {
        CHSR_COOKIE: {
            USER_EMAIL: '_chsr_email',
            USER_NAME: '_chsr_username'
        },
        manager: {
            setCookie: (name: string, val?: string, expires?: string, domain?: string, path?: string) => boolean,
            getCookie: (name: string) => string,
            deleteCookie: (name: string) => string
        }
    };

    isMobileBrowser: () => boolean;
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

interface AppsAppointmentsAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, appointmentData: any) => Promise<any>;
    update: (appId: string, appointmentId: string, userId: string, appointmentData: any) => Promise<any>;
    remove: (appId: string, appointmentId: string, userId: string) => Promise<any>;
}

interface AppsChatroomsAPI {
    findAll: (userId: string) => Promise<any>;
    update: (appId: string, chatroomId: string, chatroom: any, userId: string) => Promise<any>;
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
    findOne: (appId: string, richmenuId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, postRichmenu: any, postImageFile: File) => Promise<any>;
    update: (appId: string, richmenuId: string, userId: string, putRichmenu: any, putImageFile: File) => Promise<any>;
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

interface UserChangePassword {
    password: string;
    newPassword: string;
    newPasswordCfm: string;
}

interface SignAPI {
    refresh: (userId: string) => Promise<any>;
    signOut: () => Promise<any>;
    changePassword: (userId: string, user: UserChangePassword) => Promise<any>;
}

interface BotAPI {
    getRichmenuList: (appId: string, userId: string) => Promise<any[]>;
    activateRichmenu: (appId: string, menuId: string, userId: string) => Promise<any>;
    deactivateRichmenu: (appId: string, menuId: string, userId: string) => Promise<any>;
    setDefaultRichmenu: (appId: string, menuId: string, userId: string) => Promise<any>;
    getProfile: (appId: string, platformUid: string) => Promise<any>;
    uploadFile: (appId: string, userId: string, file: File) => Promise<any>;
    moveFile: (appId: string, richMenuId: string, userId: string, path: string) => Promise<any>;
    leaveGroupRoom: (appId: string, chatroomId: string, userId: string) => Promise<any>;
}
