declare module Chatshier {
    namespace Models {
        interface Calendars {
            [calendarId: string]: Calendar
        }

        interface Calendar extends BaseProperty {
            events: CalendarEvents
        }

        interface CalendarEvents {
            [eventId: string]: CalendarEvent
        }

        interface CalendarEvent extends BaseProperty {
            description: string,
            startedTime: Date | number,
            endedTime: Date | number,
            isAllDay: boolean,
            title: string
        }
    }
}