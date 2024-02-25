import * as Turbo from '@hotwired/turbo';
import * as Bootstrap from 'bootstrap';
import { Application } from '@hotwired/stimulus';
import { definitionsFromContext } from '@hotwired/stimulus-webpack-helpers';
import ApplicationController from './controllers/application_controller';

import Pusher from "pusher-js"
import Echo from 'laravel-echo';

window.Turbo = Turbo;
window.Bootstrap = Bootstrap;
window.application = Application.start();
window.Controller = ApplicationController;

const context = require.context('./controllers', true, /\.js$/);
application.load(definitionsFromContext(context));

window.addEventListener('turbo:before-fetch-request', (event) => {
    let state = document.getElementById('screen-state').value;

    if (state.length > 0) {
        event.detail?.fetchOptions?.body?.append('_state', state)
    }
});

window.Pusher = Pusher;
window.Echo = new Echo({
    broadcaster: 'pusher',
    key: 'a4c14476f0cf642e26e1',
    cluster: 'eu',
    forceTLS: true
});
