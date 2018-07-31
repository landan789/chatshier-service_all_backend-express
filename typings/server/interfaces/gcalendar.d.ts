declare module Chatshier {
    namespace GCalendar {
        interface CalendarList {
            kind: 'calendar#calendarList',
            etag: string,
            items: CalendarResource[],
            nextPageToken: string,
            nextSyncToken: string
        }

        interface CalendarResource {
            conferenceProperties?: {
                allowedConferenceSolutionTypes: ('eventHangout' | 'eventNamedHangout' | 'hangoutsMeet')[]
            },
            description?: string,
            etag: string,
            id: string,
            kind: 'calendar#calendar',
            location?: string,
            summary: string,
            timezone?: string
        }

        interface AccessControllList {
            kind: 'calendar#acl',
            etag: string,
            items: AccessControllResource[],
            nextPageToken: string,
            nextSyncToken: string
        }

        interface AccessControllResource {
            etag: string,
            id: string,
            kind: 'calendar#aclRule',
            role: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner',
            scope: {
                type: 'default' | 'user' | 'group' | 'domain',
                value: string
            }
        }
    }
}