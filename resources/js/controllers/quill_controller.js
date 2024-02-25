import ApplicationController from "./application_controller";
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

const CURSOR_LATENCY = 1000;
const TEXT_LATENCY = 500;

export default class extends ApplicationController {

    /**
     * Initializes and configures the Quill editor for this instance.
     *
     * This function primarily does the following:
     * - Register the 'cursors' module.
     * - Construct the Quill editor options.
     * - Dispatch a 'orchid:quill' event to let other parts of application
     *   know about the editor and its options.
     * - Initialize the Quill editor with the defined options.
     * - Set up several event handlers like 'text-change', 'color', 'background' etc. for the editor.
     * - Fetches value and Id data from HTML5 data attributes.
     *
     * It's note-worthy where 'toolbar' gets its handlers like 'image'. In case of image, if
     * 'base64' data attribute equals false, it binds inline function that calls 'selectLocalImage()'.
     *
     * 'text-change' event handler is important because it ensures the textarea's value is always in sync
     * with the actual editor content and triggers an event signifying that text has been edited.
     *
     * 'color' and 'background' event handlers use 'customColor(value)' function to possibly prompt for a custom color code.
     *
     * A valid Quill and a textarea DOM elements must be present in the HTML for this function to work properly.
     *
     * The function uses properties 'this.element' and 'this.data' assuming they are set before the function is called.
     */
    connect() {
        const quill = Quill;
        const selector = this.element.querySelector('.quill').id;
        this.textarea = this.element.querySelector('textarea');

        this.isCollaborative = this.data.get('collaborative')

        quill.register('modules/cursors', QuillCursors);

        const options = {
            placeholder: this.textarea.placeholder,
            readOnly: this.textarea.readOnly,
            theme: 'snow',
            modules: {
                toolbar: {
                    container: this.containerToolbar(),
                },
                cursors: {
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

        this.value = JSON.parse(this.data.get("value"))
        this.id = this.data.get('slug')

        // set value
        this.editor.root.innerHTML = this.textarea = this.value;

        // save value
        this.editor.on('text-change', () => {
            // When usage this.editor.root.innerHtml "/n/r" has been lost
            this.textarea = this.element.querySelector('.ql-editor').innerHTML || "";
            document.dispatchEvent(new Event('change'));


            if (this.isCollaborative)
                this.triggerTextEdit(this.textarea.value)
        });

        this.cursors.createCursor('cursor', 'You', 'red')

        this.editor.getModule('toolbar').addHandler('color', (value) => {
            this.editor.format('color', this.customColor(value));
        });

        this.editor.getModule('toolbar').addHandler('background', (value) => {
            this.editor.format('background', this.customColor(value));
        });

        if (this.isCollaborative) {
            console.log('Loading collaborative space.')
            this.initCollaboratives()
        }

        this.editor.on('selection-change', (range, oldRange, source) => {
            this.debouncedUpdate = this.debounce(this.updateCursor, 500);

            if (source === 'user') {
                this.updateCursor(range);
            } else {
                this.debouncedUpdate(range);
            }
        });
    }



    /**
     * Debounces a given function, ensuring it is called only once after a certain delay.
     *
     * @param {function} func - The function to be debounced.
     * @param {number} wait - The delay in milliseconds before the debounced function is invoked.
     * @returns {function} - Returns the debounced function.
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            const later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Initializes collaborative editing activities for the instance's presence channel.
     *
     * This function sets up the necessary event listeners on the instance's presence channel
     * to support collaborative editing features. In detail:
     * - On successful subscription to the presence channel, it informs the user, updates the editor
     *   and creates a cursor.
     * - On addition of a new member, it shows a toast notification, creates a cursor for the new member
     *   and updates the cursors.
     * - On removal of a member, it shows a toast notification and removes the member's cursor.
     * - On receiving a typed text event, it updates the editor's content with the received data.
     *
     * The function relies on the PusherJS library to handle real-time events. It also makes use of
     * this instance's `toast` method.
     *
     * Note: Make sure PusherClient has been correctly initialized before calling this function.
     */
    initCollaboratives() {
        this.channel = window.Echo.join(`presence-editor.${this.id}`)
            .joining(user => {
                this.toast(`${user.name} Joined the room`, "success")

                this.cursorId = `cursor#${user.id}`;
                this.cursors.createCursor(this.cursorId , user.name, 'yellow')
                this.cursors.clearCursors()
            })
            .leaving(user => {
                this.toast(`${user.name} Left the room`, "primary")

                this.cursors.removeCursor(this.cursorId)
                this.cursors.clearCursors()
            })
            .listenForWhisper('editing', (data) => {
                this.editor.updateContents({
                    insert: data.value
                });
            })
    }

    updateCursor(range) {
        // Use a timeout to simulate a high latency connection.
        setTimeout(() => this.cursors.moveCursor(this.cursorId, range), CURSOR_LATENCY);
    }

    disconnect() {
        this.channel.leave(`presence-editor.${this.id}`)
    }


    /**
     * Triggers a text edit event on the instance's presence channel.
     *
     * This function makes use of the PusherJS library's trigger method to signify
     * that the client has edited text. The event is named after the format obtained
     * from the `getEventName()` method of the instance. The function ensures error
     * handling in case the `presenceChannel` or `id` attributes are not initialized.
     *
     * @param {Object} data The data representing the text that has been edited.
     * This could involve multiple properties depending on your application's needs (e.g., text content, author, timestamp).
     */
    triggerTextEdit(data) {
        this.channel.whisper('editing', {
            value: data
        })
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
