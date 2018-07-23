declare module Chatshier {
    namespace Models {
        interface AppsAppointments {
            [appId: string]: {
                appointments: Appointments
            }
        }

        interface Appointments {
            [appointmentId: string]: Appointment
        }

        interface Appointment extends BaseProperty {
            product_id: string,
            platformUid: string,
            canlendarEventId: string,
            startedTime: Date | number,
            endedTime: Date | number
        }
    }
}