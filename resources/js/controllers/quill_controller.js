import ApplicationController from "./application_controller";
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

export default class extends ApplicationController {
    /**
     *
     */
    connect() {
        const quill = Quill;
        const selector = this.element.querySelector('.quill').id;
        const textarea = this.element.querySelector('textarea');

        quill.register('modules/cursors', QuillCursors);

        const options = {
            placeholder: textarea.placeholder,
            readOnly: textarea.readOnly,
            theme: 'snow',
            modules: {
                toolbar: {
                    container: this.containerToolbar(),
                },
                cursors: {
                    hideDelayMs: 5000,
                    hideSpeedMs: 0,
                    selectionChangeSource: null,
                    transformOnTextChange: true,
                },
            }
        };

        // Dispatch the event for customization and installation of plugins
        document.dispatchEvent(new CustomEvent('orchid:quill', {
            detail: {
                quill: quill,
                options: options
            }
        }));

        this.editor = new quill(`#${selector}`, options);
        this.cursors = this.editor.getModule('cursors');

        // quill editor add image handler
        let isBase64Format = JSON.parse(this.data.get('base64'));
        if (! isBase64Format) {
            this.editor.getModule('toolbar').addHandler('image', () => {
                this.selectLocalImage();
            });
        }

        let value = JSON.parse(this.data.get("value"))
        this.id = this.data.get('slug')

        // set value
        this.editor.root.innerHTML = textarea.value = value;

        // save value
        this.editor.on('text-change', () => {
            // When usage this.editor.root.innerHtml "/n/r" has been lost
            textarea.value = this.element.querySelector('.ql-editor').innerHTML || "";
            textarea.dispatchEvent(new Event('change'));

            this.triggerTextEdit(textarea.value)
        });

        this.editor.getModule('toolbar').addHandler('color', (value) => {
            this.editor.format('color', this.customColor(value));
        });

        this.editor.getModule('toolbar').addHandler('background', (value) => {
            this.editor.format('background', this.customColor(value));
        });

        const presenceChannel = window.PusherClient.subscribe(`presence-editor-${this.id}`);
        presenceChannel.bind("pusher:subscription_succeeded", function () {
            const me = presenceChannel.members.info;

            this.toast(`${me.name} You created a new collaborative space.`, "success")
            this.editor.update();
            this.cursors.createCursor(me.id, me.name, 'red')

            presenceChannel.bind("pusher:member_added", (member) => {
                const userInfo = member.info;

                this.toast(`${userInfo.name} Joined the editor`, "warning")
                this.cursors.createCursor(me.id, me.name, 'yellow')
                this.cursors.update()
            });

            presenceChannel.bind("pusher:member_removed", (member) => {
                const userInfo = member.info;

                this.toast(`${userInfo.name} Left the editor`, "warning")

                this.cursors.removeCursor(userInfo.id)
                this.cursors.update()
            });

            presenceChannel.bind(`client-typed-text-${this.id}`, (data) => {
                this.editor.setContents(data.value);
            });
        });
    }

    disconnect() {
        window.PusherClient.subscribe(`presence-editor-${this.id}`);
    }

    triggerTextEdit(data) {
        window.PusherClient.channel.trigger(`client-typed-text-${this.id}`, data)
    }

    /**
     * Show dialog for custom color
     *
     * @param value
     */
    customColor = (value) => {
        return value === 'custom-color'
            ? window.prompt('Enter Color Code (#c0ffee or rgba(255, 0, 0, 0.5))')
            : value;
    }

    colors() {
        return [
            '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc',
            '#9933ff', '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc',
            '#cce0f5', '#ebd6ff', '#bbbbbb', '#f06666', '#ffc266', '#ffff66',
            '#66b966', '#66a3e0', '#c285ff', '#888888', '#a10000', '#b26b00',
            '#b2b200', '#006100', '#0047b2', '#6b24b2', '#444444', '#5c0000',
            '#663d00', '#666600', '#003700', '#002966', '#3d1466', 'custom-color'
        ];
    }

    containerToolbar() {
        const controlsGroup = {
            "text":   ['bold', 'italic', 'underline', 'strike', 'link', 'clean'],
            "quote":  ['blockquote', 'code-block'],
            "color":  [{color: this.colors()}, {background: this.colors()}],
            "header": [{header: '1'}, {header: '2'}],
            "list":   [{list: 'ordered'}, {list: 'bullet'}],
            "format": [{indent: '-1'}, {indent: '+1'}, {align: []}],
            "media":  ['image', 'video'],
        }

        return JSON.parse(this.data.get("toolbar"))
            .map(tool => controlsGroup[tool]);
    }

    /**
     * Step1. select local image
     *
     */
    selectLocalImage() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.click();

        // Listen upload local image and save to server
        input.onchange = () => {
            const file = input.files[0];

            // file type is only image.
            if (/^image\//.test(file.type)) {
                this.saveToServer(file);
            } else {
                this.alert('Validation error', 'You could only upload images.', 'danger');
                console.warn('You could only upload images.');
            }
        };
    }

    /**
     * Step2. save to server
     *
     * @param {File} file
     */
    saveToServer(file) {
        const formData = new FormData();
        formData.append('file', file);

        fetch(`https://autumn.fluffici.eu/attachments`, {
            method: 'post',
            body: formData
        }).then((res) => {
            if (res.ok) {
                res.json().then(async result => {
                    this.insertToEditor(`https://autumn.fluffici.eu/attachments/${result.id}`)
                })
            } else {
                this.displayError(res.json())
            }
        })
    }

    displayError(error) {
        error.then(result => {
            if (result.type === "Malware") {
                this.toast("A malware was detected, we cannot send the file.", "danger")
            } else if (result.type === "S3Error") {
                this.toast("The ObjectStorage backend is offline", "danger")
            } else if (result.type === "DatabaseError") {
                this.toast("The database has struggles to answer.", "danger")
            } else if (result.type === "FileTypeNotAllowed") {
                this.toast("Incorrect file type for this tag.", "danger")
            } else if (result.type === "UnknownTag") {
                this.toast("This tag does not exists.", "danger")
            } else if (result.type === "MissingData") {
                this.toast("Missing data in the request.", "danger")
            } else if (result.type === "FailedToReceive") {
                this.toast("The upload was aborted.", "danger")
            } else if (result.type === "FileTooLarge") {
                this.toast("This file is too large ( Maximum size allowed : " + (error.max_size / 1000 / 1000) + " Mb )", "danger")
            } else {
                this.toast("Autumn have not responded, is the fox gone OwO? *screech*")
            }
        })
    }

    /**
     * Step3. insert image url to rich editor.
     *
     * @param {string} url
     */
    insertToEditor(url) {
        // push image url to rich editor.
        const range = this.editor.getSelection();
        this.editor.insertEmbed(range.index, 'image', url);
    }
}
