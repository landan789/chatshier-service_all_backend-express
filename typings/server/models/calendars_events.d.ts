declare module Chatshier {
    namespace Models {
        interface Calendars {
            [calendarId: string]: Calendar
        }

        interface Calendar {
            _id: any,
            isDeleted: boolean,
            events: CalendarEvents
        }

        interface CalendarEvents {
            [eventId: string]: CalendarEvent
        }

        interface CalendarEvent {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            description: string,
            startedTime: Date | number,
            endedTime: Date | number,
            isAllDay: boolean,
            isDeleted: boolean,
            title: string
        }
    }
}