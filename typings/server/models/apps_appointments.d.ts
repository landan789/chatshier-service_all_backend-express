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

        interface Appointment {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            name: string,
            items: AppointmentItems[],
            members: AppointmentMembers[]
        }

        interface AppointmentItems {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            name: string,
            member_ids: Array<string>
        }

        interface AppointmentMembers {
            _id: any,
            createdTime: Date | number,
            updatedTime: Date | number,
            isDeleted: boolean,
            name: string,
            item_id: string,
            timetable: Object // needs to be defined
        }
    }
}