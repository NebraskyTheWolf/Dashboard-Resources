import ApplicationController from "./application_controller";
import Cropper from 'cropperjs';
import {Modal} from "bootstrap";

export default class extends ApplicationController {

    static values = {
        maxSizeMessage: {
            type: String,
            default: "The download file is too large. Max size: {value} MB"
        },
        type: {
            type: String,
            default: 'image/png'
        },
        keepOriginalType: {
            type: Boolean,
            default: false
        }
    }

    /**
     * @type {string[]}
     */

    static targets = [
        "source",
        "upload"
    ];

    /**
     *
     */
    connect() {
        let objectId = document.getElementById('object_id').value;
        let tag = document.getElementById('bucket').value;

        if (objectId != undefined || objectId != null && toString(objectId).length > 8) {
            this.element.querySelector('.cropper-preview').src = `https://autumn.rsiniya.uk/${tag}/${objectId}`;
        } else {
            this.element.querySelector('.cropper-preview').classList.add('none');
            this.element.querySelector('.cropper-remove').classList.add('none');

            this.clear()
        }

        let cropPanel = this.element.querySelector('.upload-panel');

        cropPanel.width = this.data.get('width');
        cropPanel.height = this.data.get('height');

        this.cropper = new Cropper(cropPanel, {
            viewMode: 2,
            aspectRatio: this.data.get('width') / this.data.get('height'),
            minContainerHeight: 500,
        });
    }

    /**
     *
     * @returns {Modal}
     */
    getModal()
    {
        if (!this.modal) {
            this.modal = new Modal(this.element.querySelector('.modal'));
        }

        return this.modal;
    }

    /**
     * Event for uploading image
     *
     * @param event
     */
    upload(event) {
        if (this.keepOriginalTypeValue) {
            this.typeValue = event.target.files[0].type
        }

        if (!event.target.files[0]) {
            this.getModal().show();
            return;
        }

        let reader = new FileReader();
        reader.readAsDataURL(event.target.files[0]);

        reader.onloadend = () => {
            this.cropper.replace(reader.result)
        };

        this.getModal().show();
    }

    /**
     *
     */
    openModal(event)
    {
        if (!event.target.files[0]) {
            return;
        }

        this.getModal().show();
    }

    /**
     * Action on click button "Crop"
     */
    crop() {

        this.cropper.getCroppedCanvas({
            width: this.data.get('width'),
            height: this.data.get('height'),
            minWidth: this.data.get('min-width'),
            minHeight: this.data.get('min-height'),
            maxWidth: this.data.get('max-width'),
            maxHeight: this.data.get('max-height'),
            imageSmoothingQuality: 'medium',
        }).toBlob((blob) => {
            const formData = new FormData();

            formData.append('file', blob);

            var tag = document.getElementById("bucket").value;

            fetch(`https://autumn.rsiniya.uk/${tag}`, {
                method: 'post',
                body: formData
            }).then((res) => {
                if (res.ok) {
                    this.process(this.element, res.json(), tag)
                } else {
                    this.alert('Validation error', 'File upload error');
                }
            })

        }, this.typeValue);

    }

    process(element, data, tag) {
        data.then(async result => {
            var objectId = result.id;

            let image = `https://autumn.rsiniya.uk/${tag}/${objectId}`;

            element.querySelector('.cropper-preview').src = image;
            element.querySelector('.cropper-preview').classList.remove('none');
            element.querySelector('.cropper-remove').classList.remove('none');
            element.querySelector('.cropper-path').value = objectId;
            element.querySelector('.cropper-path').dispatchEvent(new Event("change"));

            this.getModal().hide();

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
                    this.toast("File validation error", "danger")
                }
            })
        })
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

    /**
     *
     */
    clear() {
        this.element.querySelector('.cropper-path').value = '';
        this.element.querySelector('.cropper-preview').src = '';
        this.element.querySelector('.cropper-preview').classList.add('none');
        this.element.querySelector('.cropper-remove').classList.add('none');
    }

    /**
     * Action on click buttons
     */
    moveleft() {
        this.cropper.move(-10, 0);
    }

    moveright() {
        this.cropper.move(10, 0);
    }

    moveup() {
        this.cropper.move(0, -10);
    }

    movedown() {
        this.cropper.move(0, 10);
    }

    zoomin() {
        this.cropper.zoom(0.1);
    }

    zoomout() {
        this.cropper.zoom(-0.1);
    }

    rotateleft() {
        this.cropper.rotate(-5);
    }

    rotateright() {
        this.cropper.rotate(5);
    }

    scalex() {
        const dataScaleX = this.element.querySelector('.cropper-dataScaleX');
        this.cropper.scaleX(-dataScaleX.value);
    }

    scaley() {
        const dataScaleY = this.element.querySelector('.cropper-dataScaleY');
        this.cropper.scaleY(-dataScaleY.value)
    }

    aspectratiowh() {
        this.cropper.setAspectRatio(this.data.get('width') / this.data.get('height'));
    }

    aspectratiofree() {
        this.cropper.setAspectRatio(NaN);
    }

}
