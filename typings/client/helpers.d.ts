/// <reference path='../server/models/core.d.ts' />
/// <reference path='../server/models/apps_autoreplies.d.ts' />
/// <reference path='../server/models/apps_categories.d.ts' />
/// <reference path='../server/models/apps_chatrooms.d.ts' />
/// <reference path='../server/models/apps_composes.d.ts' />
/// <reference path='../server/models/apps_fields.d.ts' />
/// <reference path='../server/models/apps_greetings.d.ts' />
/// <reference path='../server/models/apps_imagemaps.d.ts' />
/// <reference path='../server/models/apps_keywordreplies.d.ts' />
/// <reference path='../server/models/apps_payments.d.ts' />
/// <reference path='../server/models/apps_richmenus.d.ts' />
/// <reference path='../server/models/apps_templates.d.ts' />
/// <reference path='../server/models/apps_tickets.d.ts' />
/// <reference path='../server/models/apps.d.ts' />
/// <reference path='../server/models/calendars_events.d.ts' />
/// <reference path='../server/models/consumers.d.ts' />
/// <reference path='../server/models/groups_members.d.ts' />
/// <reference path='../server/models/groups.d.ts' />
/// <reference path='../server/models/users_onesignals.d.ts' />
/// <reference path='../server/models/users.d.ts' />

interface Window {
    restfulAPI: {
        setJWT: (value: string) => void,
        apps: AppAPI,
        appsAutoreplies: AppsAutorepliesAPI,
        appsAppointments: AppsAppointmentsAPI,
        appsCategories: AppsCategoriesAPI,
        appsChatrooms: AppsChatroomsAPI,
        appsChatroomsMessagers: AppsChatroomsMessagersAPI,
        appsComposes: AppsComposesAPI,
        appsGreetings: AppsGreetingsAPI,
        appsKeywordreplies: AppsKeywordrepliesAPI,
        appsTemplates: AppsTemplatesAPI,
        appsPayments: AppsPaymentsAPI,
        appsRichmenus: AppsRichmenusAPI,
        appsImagemaps: AppsImagemapsAPI,
        appsFields: AppsFieldsAPI,
        appsTickets: AppsTicketsAPI,
        bot: BotAPI,
        image: ImageAPI,
        calendarsEvents: CalendarsEventsAPI,
        consumers: ConsumersAPI,
        groupsMembers: GroupsMembersAPI,
        groups: GroupsAPI,
        usersOneSignals: UsersOneSignalsAPI,
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
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Apps }>;
    findOne: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Apps }>;
    insert: (userId: string, postAppData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Apps }>;
    update: (appId: string, userId: string, putAppData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Apps }>;
    remove: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Apps }>;
    TYPES: {
        SYSTEM: 'SYSTEM',
        CHATSHIER: 'CHATSHIER',
        LINE: 'LINE',
        FACEBOOK: 'FACEBOOK'
    }
}

interface AppsAutorepliesAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsAutoreplies }>;
    insert: (appId: string, userId: string, autoreplyData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsAutoreplies }>;
    update: (appId: string, autoreplyId: string, userId: string, autoreplyData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsAutoreplies }>;
    remove: (appId: string, autoreplyId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsAutoreplies }>;
}

interface AppsAppointmentsAPI {
    findAll: (appId: string, userId: string) => Promise<any>;
    insert: (appId: string, userId: string, appointmentData: any) => Promise<any>;
    update: (appId: string, appointmentId: string, userId: string, appointmentData: any) => Promise<any>;
    remove: (appId: string, appointmentId: string, userId: string) => Promise<any>;
}

interface AppsCategoriesAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsCategories }>;
    insert: (appId: string, userId: string, category: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsCategories }>;
    update: (appId: string, categoryId: string, category: any, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsCategories }>;
    remove: (appId: string, categoryId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsCategories }>;
}

interface AppsChatroomsAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsChatrooms }>;
    update: (appId: string, chatroomId: string, chatroom: any, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsChatrooms }>;
}

interface AppsChatroomsMessagersAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsChatrooms }>;
    findOne: (appId: string, chatroomId: string, messagerId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsChatrooms }>;
    update: (appId: string, chatroomId: string, messagerId: string, userId: string, messager: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsChatrooms }>;
    updateByPlatformUid: (appId: string, chatroomId: string, platformUid: string, userId: string, messager: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsChatrooms }>;
}

interface AppsComposesAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsComposes }>;
    insert: (appId: string, userId: string, composeData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsComposes }>;
    update: (appId: string, composeId: string, userId: string, composeData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsComposes }>;
    remove: (appId: string, composeId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsComposes }>;
}

interface AppsGreetingsAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsGreetings }>;
    insert: (appId: string, userId: string, greetingData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsGreetings }>;
    remove: (appId: string, greetingId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsGreetings }>;
}

interface AppsKeywordrepliesAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsKeywordreplies }>;
    insert: (appId: string, userId: string, keywordreplyData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsKeywordreplies }>;
    update: (appId: string, keywordreplyId: string, userId: string, keywordreplyData: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsKeywordreplies }>;
    remove: (appId: string, keywordreplyId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsKeywordreplies }>;
}

interface AppsTemplatesAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTemplates }>;
    findOne: (appId: string, templateId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTemplates }>;
    insert: (appId: string, userId: string, postTemplate: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTemplates }>;
    update: (appId: string, templateId: string, userId: string, putTemplate: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTemplates }>;
    remove: (appId: string, templateId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTemplates }>;
}

interface AppsPaymentsAPI {
    findAll: (appId: string | void, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsPayments }>;
    findOne: (appId: string, paymentId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsPayments }>;
    insert: (appId: string, userId: string, postPayment: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsPayments }>;
    update: (appId: string, paymentId: string, userId: string, putPayment: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsPayments }>;
    remove: (appId: string, paymentId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsPayments }>;
}

interface AppsRichmenusAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsRichmenus }>;
    findOne: (appId: string, richmenuId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsRichmenus }>;
    insert: (appId: string, userId: string, postRichmenu: any, postImageFile: File) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsRichmenus }>;
    update: (appId: string, richmenuId: string, userId: string, putRichmenu: any, putImageFile: File) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsRichmenus }>;
    remove: (appId: string, richmenuId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsRichmenus }>;
}

interface AppsImagemapsAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsImagemaps }>;
    findOne: (appId: string, imagemapId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsImagemaps }>;
    insert: (appId: string, userId: string, postImagemap: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsImagemaps }>;
    update: (appId: string, imagemapId: string, userId: string, putImagemap: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsImagemaps }>;
    remove: (appId: string, imagemapId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsImagemaps }>;
}

interface AppsFieldsAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsFields }>;
    insert: (appId: string, userId: string, postField: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsFields }>;
    update: (appId: string, fieldId: string, userId: string, putField: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsFields }>;
    remove: (appId: string, fieldId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsFields }>;
    TYPES: {
        SYSTEM: 'SYSTEM',
        DEFAULT: 'DEFAULT',
        CUSTOM: 'CUSTOM'
    },
    SETS_TYPES: {
        TEXT: 'TEXT',
        NUMBER: 'NUMBER',
        DATE: 'DATE',
        SELECT: 'SELECT',
        MULTI_SELECT: 'MULTI_SELECT',
        CHECKBOX: 'CHECKBOX'
    }
}

interface AppsTicketsAPI {
    findAll: (appId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTickets }>;
    insert: (appId: string, userId: string, postTicket: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTickets }>;
    update: (appId: string, ticketId: string, userId: string, putTicket: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTickets }>;
    remove: (appId: string, ticketId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.AppsTickets }>;
}

interface CalendarsEventsAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Calendars }>;
    insert: (userId: string, postCalendar: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Calendars }>;
    update: (calendarId: string, eventId: string, userId: string, putCalendar: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Calendars }>;
    remove: (calendarId: string, eventId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Calendars }>;
}

interface ConsumersAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Consumers }>;
    findOne: (platformUid: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Consumers }>;
    update: (platformUid: string, userId: string, putConsumer: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Consumers }>;
}

interface GroupsMembersAPI {
    findAll: (groupId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
    insert: (groupId: string, userId: string, postGroupMember: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
    update: (groupId: string, memberId: string, userId: string, putGroupMember: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
    remove: (groupId: string, memberId: string, userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
    TYPES: {
        OWNER: 'OWNER',
        ADMIN: 'ADMIN',
        WRITE: 'WRITE',
        READ: 'READ'
    }
}

interface GroupsAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
    insert: (userId: string, group: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
    update: (groupId: string, userId: string, putGroup: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Groups }>;
}

interface UsersOneSignalsAPI {
    findAll: (userId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.UsersOneSignals }>;
    insert: (userId: string, oneSignal: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.UsersOneSignals }>;
    remove: (userId: string, oneSignalId: string) => Promise<{ status: number, msg: string, data: Chatshier.Models.UsersOneSignals }>;
}

interface UsersAPI {
    find: (userId: string, email?: string, useFuzzy?: boolean) => Promise<{ status: number, msg: string, data: Chatshier.Models.Users | Chatshier.Models.User[] }>;
    update: (userId: string, putUser: any) => Promise<{ status: number, msg: string, data: Chatshier.Models.Users }>;
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

interface ImageAPI {
    uploadFile: (userId: string, file: File) => Promise<{ status: number, msg: string, data: { url: string, originalFilePath: string } }>;
    moveFile: (userId: string, fromPath: string, toPath: string) => Promise<{ status: number, msg: string }>;
}
