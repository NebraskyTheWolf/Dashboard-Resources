import * as Turbo from '@hotwired/turbo';
import * as Bootstrap from 'bootstrap';
import { Application } from '@hotwired/stimulus';
import { definitionsFromContext } from '@hotwired/stimulus-webpack-helpers';
import ApplicationController from './controllers/application_controller';
import { Client, RegistrationState, TokenProvider } from "@pusher/push-notifications-web";

import * as Pusher from "pusher-js"

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

window.PusherClient =  new Pusher('a4c14476f0cf642e26e1', {
    cluster: 'eu'
});

window.BeamClient = new Client({
    instanceId: "63e32cff-b20c-4c92-bb49-0e40cfd1dbe3",
});

window.BeamRegistrationState = RegistrationState;
window.BeamTokenProvider = TokenProvider;


