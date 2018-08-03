declare module Chatshier {
    namespace GCalendar {
        interface WebhookChannel {
            kind: 'api#channel',
            id: string,
            resourceId: string,
            resourceUri: string,
            token?: string,
            long?: number
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

        interface EventList {
            kind: 'calendar#events',
            etag: string,
            summary: string,
            description: string,
            updated: string,
            timeZone: string,
            accessRole: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner',
            defaultReminders: {
                method: 'email' | 'sms' | 'popup',
                minutes: number
            }[],
            nextPageToken?: string,
            nextSyncToken: string,
            items: EventResource[]
        }

        interface EventResource {
            kind: 'calendar#event',
            etag: string,
            id: string,
            status: string,
            htmlLink: string,
            created: string,
            updated: string,
            summary: string,
            description?: string,
            location?: string,
            colorId?: string,
            creator: {
                id: string,
                email: string,
                displayName: string,
                self: boolean
            },
            organizer: {
                id: string,
                email: string,
                displayName: string,
                self: boolean
            },
            start: {
                date: string,
                dateTime: string,
                timeZone: string
            },
            end: {
                date: string,
                dateTime: string,
                timeZone: string
            },
            endTimeUnspecified: boolean,
            recurrence: string[],
            recurringEventId: string,
            originalStartTime: {
                date: string,
                dateTime: string,
                timeZone: string
            },
            transparency: string,
            visibility: 'default' | 'public' | 'private' | 'confidential',
            iCalUID: string,
            sequence: number,
            attendees: {
                id: string,
                email: string,
                displayName?: string,
                organizer: boolean,
                self: boolean,
                resource?: boolean,
                optional?: boolean,
                responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted',
                comment?: string,
                additionalGuests?: number
            }[],
            attendeesOmitted?: boolean,
            extendedProperties: {
                private: { [ key: string ]: string },
                shared: { [ key: string ]: string }
            },
            hangoutLink: string,
            conferenceData: {
                createRequest: {
                    requestId: string,
                    conferenceSolutionKey: {
                        type: string
                    },
                    status: {
                        statusCode: 'pending' | 'success' | 'failure'
                    }
                },
                entryPoints: {
                    entryPointType: 'video' | 'phone' | 'sip' | 'more',
                    uri: string,
                    label?: string,
                    pin?: string,
                    accessCode?: string,
                    meetingCode?: string,
                    passcode: string,
                    password?: string
                }[],
                conferenceSolution: {
                    key: {
                      type: 'eventHangout' | 'eventNamedHangout' | 'hangoutsMeet'
                    },
                    name: string,
                    iconUri: string
                },
                conferenceId?: string,
                signature?: string,
                notes?: string
            },
            gadget: {
                type: string,
                title: string,
                link: string,
                iconLink: string,
                width?: number,
                height?: number,
                display?: 'icon' | 'chip',
                preferences: {
                    [key: string]: string
                }
            },
            anyoneCanAddSelf?: boolean,
            guestsCanInviteOthers?: boolean,
            guestsCanModify?: boolean,
            guestsCanSeeOtherGuests?: boolean,
            privateCopy?: boolean,
            locked: boolean,
            reminders: {
                useDefault: boolean,
                overrides: {
                    method: 'email' | 'sms' | 'popup',
                    minutes: number
                }[]
            },
            source: {
                url: string,
                title: string
            },
            attachments: {
                fileUrl: string,
                title: string,
                mimeType: string,
                iconLink: string,
                fileId: string
            }[]
        }
    }
}