declare module Chatshier {
    namespace Models {
        interface AppsTickets {
            [appId: string]: {
                tickets: Tickets
            }
        }

        interface Tickets {
            [ticketId: string]: Ticket
        }

        interface Ticket {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            description: string,
            dueTime: Date | number,
            platformUid: string,
            assigned_id: string,
            priority: number,
            status: number
        }
    }
}