import ApplicationController from "./application_controller";

import {Calendar, EventAddArg, EventChangeArg, EventRemoveArg} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import googleCalendar from '@fullcalendar/google-calendar';

export default class extends ApplicationController {

    connect() {
        this.slug = this.data.get('slug')
        this.editable = this.data.get('editable')
        this.color = this.data.get('color')
        this.locale = this.data.get('locale')
        this.initialView = this.data.get('initial-view')

        this.isGoogleCalendar = this.data.get('google-calendar')
        this.googleCalendarAPI = this.data.get('google-calendar-secret')
        this.googleCalendarURL = this.data.get('google-calendar-url')

        this.calendarEL = document.getElementById("calendar");

        console.log('Loading calendar...')

        if (this.isGoogleCalendar) {
            this.calendar = new Calendar(this.calendarEL, {
                plugins: [dayGridPlugin, timeGridPlugin, listPlugin,  googleCalendar, interactionPlugin ],
                locale: this.locale,
                googleCalendarApiKey: this.googleCalendarAPI,
                events: {
                    googleCalendarId: this.googleCalendarURL
                },
                editable: this.editable,
                droppable: true,
                headerToolbar: {
                    left: 'prev,next',
                    center: 'title',
                    right: 'dayGridWeek,dayGridDay'
                },
                selectable: true
            });

            console.log('Google calendar detected.')

            this.calendar.render();
            console.log('Google calendar render fired.')
        } else {
            this.calendar = new Calendar(this.calendarEL, {
                timeZone: 'Europe/Prague',
                plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
                eventSources: [
                    {
                        url: `https://dashboard.fluffici.eu/api/calendar/events?calendarId=${this.slug}`,
                        method: 'POST',
                        failure: function() {
                            this.toast("there was an error while fetching events!", "error")
                        },
                        success: function () {
                            this.toast("The calendar was successfully loaded.", "success")
                        },
                        color: this.color,
                        textColor: 'black'
                    }
                ],
                locale: this.locale,
                droppable: true,
                editable: this.editable,
                headerToolbar: {
                    left: 'prev,next',
                    center: 'title',
                    right: 'dayGridWeek,dayGridDay'
                },
                selectable: true
            });

            console.log('Custom sourced calendar detected.')

            this.calendar.on('eventAdd', (data) => {
                element.dispatchEvent(new Event('event-add'));
                this.addToServer(data)
            });

            this.calendar.on('eventChange', (data) => {
                element.dispatchEvent(new Event('event-change'));
                this.changeToServer(data)
            });

            this.calendar.on('eventRemove', (data) => {
                element.dispatchEvent(new Event('event-remove'));
                this.removeToServer(data)
            });

            this.calendar.render();
            console.log('Custom calendar render fired.')
        }

        this.autoUpdate()
    }

    disconnect() {
        this.calendar.destroy()
    }

    autoUpdate() {
        const channel = window.PusherClient.subscribe('calendar-update')
        channel.bind(`update`, (payload) => {
            this.calendar.render()
        })
    }

    addToServer(data) {
        fetch(`https://dashboard.fluffici.eu/api/calendar/add?calendarId=${this.slug}`, {
            method: 'post',
            body: data.event.toJSON()
        }).then((res) => {
            if (res.ok) {
                this.toast("New event saved.", "warning")
            } else {
                this.alert('Event Add', 'Cannot add event on remote server.')
                data.revert()
            }
        })
    }

    changeToServer(data) {
        fetch(`https://dashboard.fluffici.eu/api/calendar/update?calendarId=${this.slug}`, {
            method: 'post',
            body: JSON.parse({
                old: data.oldEvent.toJSON(),
                current: data.event.toJSON()
            })
        }).then((res) => {
            if (res.ok) {
                this.toast("New event saved.", "warning")
            } else {
                this.alert('Event Add', 'Cannot update event on remote server.')
                data.revert()
            }
        })
    }

    removeToServer(data) {
        fetch(`https://dashboard.fluffici.eu/api/calendar/remove?calendarId=${this.slug}`, {
            method: 'post',
            body: JSON.parse({
                current: data.event.toJSON()
            })
        }).then((res) => {
            if (res.ok) {
                this.toast("New event saved.", "warning")
            } else {
                this.alert('Event Remove', 'Cannot remove event on remote server.')
                data.revert()
            }
        })
    }
}
