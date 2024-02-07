import { Controller } from '@hotwired/stimulus';
import ApplicationController from "./application_controller";

export default class extends ApplicationController {
    static values = {
        name: {
            type: String,
            default: 'attachment[]',
        },
        attachment: {
            type: Array,
            default: [],
        },
        count: {
            type: Number,
            default: 1,
        },
        size: {
            type: Number,
            default: 10,
        },
        loading: {
            type: Number,
            default: 0,
        },
        errorSize: {
            type: String,
            default: 'File ":name" is too large to upload',
        },
        errorType: {
            type: String,
            default: 'The attached file must be an image',
        },
    };

    static targets = ['files', 'preview', 'container'];

    connect() {
        this.togglePlaceholderShow();
        var avatarId = document.getElementById("avatar_id").value;
        if (avatarId != null
            || avatarId != undefined) {
            this.renderPreview(avatarId, 'avatars');
        }
    }

    change(event) {
        [...event.target.files].forEach((file) => {
            this.upload(file);
        });

        // clear
        let data = new DataTransfer();
        event.target.files = data.files;
    }

    upload(file) {
        let data = new FormData();
        data.append('file', file);

        this.loadingValue = this.loadingValue + 1;
        this.element.ariaBusy = 'true';

        var tag = document.getElementById("bucket").value;

        fetch(`https://autumn.fluffici.eu/${tag}`, {
            method: 'post',
            body: data
        }).then((res) => {
            if (res.ok) {
                this.process(res.json(), tag)
            } else {
                this.element.ariaBusy = 'false';
                this.loadingValue = this.loadingValue - 1;
                this.togglePlaceholderShow();

                this.displayError(res.json())
            }
        })
    }

    remove(event) {
        event.currentTarget.closest('.pip').remove();
        this.togglePlaceholderShow();
    }

    displayError(error) {
        error.then(result => {
            if (result.type == "Malware") {
                this.toast("A malware was detected, we cannot send the file.", "danger")
            } else if (result.type == "S3Error") {
                this.toast("The ObjectStorage backend is offline", "danger")
            } else if (result.type == "DatabaseError") {
                this.toast("The database has struggles to answer.", "danger")
            } else if (result.type == "FileTypeNotAllowed") {
                this.toast("Incorrect file type for this tag.", "danger")
            } else if (result.type == "UnknownTag") {
                this.toast("This tag does not exists.", "danger")
            } else if (result.type == "MissingData") {
                this.toast("Missing data in the request.", "danger")
            } else if (result.type == "FailedToReceive") {
                this.toast("The upload was aborted.", "danger")
            } else if (result.type == "FileTooLarge") {
                this.toast("This file is too large ( Maximum size allowed : " + (error.max_size / 1000 / 1000) + " Mb )", "danger")
            } else {
                this.toast("Autumn have not responded, is the fox gone OwO? *screech*")
            }
        })
    }

    process(data, tag) {
        data.then(async result => {
            this.element.ariaBusy = 'false';
            this.loadingValue = this.loadingValue - 1;

            var objectId = result.id;

            // Update Label after push
            this.togglePlaceholderShow();
            this.renderPreview(objectId, tag);

            var body = new FormData();
            body.append('id', objectId)
            body.append('tag', tag)
            body.append('user_id', parseInt(document.getElementById("user_id").value))
            body.append('action_id', document.getElementById("action_id").value)

            await fetch(this.prefix("/systems/uploaded"), {
                method: 'post',
                body: body,
                headers: {
                    'X-CSRF-Token': document.head.querySelector('meta[name="csrf_token"]').content
                }
            })
            .then(res => {
                if (res.ok) {
                    res.json().then(data => {
                        this.toast("File uploaded. (" + data.objectId.substring(0, 8) + " )")
                    })
                } else {
                    this.element.ariaBusy = 'false';
                    this.loadingValue = this.loadingValue - 1;
                    this.togglePlaceholderShow();

                    this.toast("File validation error", "danger")
                }
            })
        })
    }

    /**
     *
     */
    togglePlaceholderShow() {
        this.containerTarget.classList.toggle('d-none', false);
    }

    /**
     *
     * @param attachment
     * @param bucket the remote tag from Autumn
     * @param replace
     */
    renderPreview(attachment, bucket, replace = null) {
        const pip = document.createElement('div');
        pip.id = `attachment-${attachment.id}`;
        pip.classList.add('pip', 'col', 'position-relative');

        pip.innerHTML = `
            <input type="hidden" name="${this.nameValue}" value="${attachment}">
            <img class="attach-image rounded border user-select-none" src="https://autumn.fluffici.eu/${bucket}/${attachment}"/>
        `;

        if (replace !== null) {
            this.element.querySelector(`#attachment-${replace}`).outerHTML = pip.outerHTML;
            return;
        }

        this.containerTarget.insertAdjacentElement('beforebegin', pip);
    }
}
