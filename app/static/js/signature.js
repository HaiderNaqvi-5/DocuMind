const signaturePads = {};


export function clearSignaturePads() {

    for (
        const key
        in signaturePads
    ) {

        delete signaturePads[key];

    }

}


export function createSignatureField(
    field,
    wrapper
) {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        700;


    canvas.height =
        180;


    canvas.className =
        "signature-canvas";


    canvas.id =
        `signature_${field.field_key}`;


    wrapper.appendChild(
        canvas
    );


    const clearButton =
        document.createElement(
            "button"
        );


    clearButton.type =
        "button";


    clearButton.className =
        "clear-signature-button";


    clearButton.textContent =
        "Clear Signature";


    wrapper.appendChild(
        clearButton
    );


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.lineWidth =
        2;


    ctx.lineCap =
        "round";


    const pad = {

        canvas,

        ctx,

        drawing: false,

        hasSignature: false

    };


    signaturePads[
        field.field_key
    ] = pad;


    function getPosition(
        event
    ) {

        const rect =
            canvas.getBoundingClientRect();


        const scaleX =
            canvas.width
            / rect.width;


        const scaleY =
            canvas.height
            / rect.height;


        if (
            event.touches
            &&
            event.touches.length > 0
        ) {

            return {

                x:
                    (
                        event
                        .touches[0]
                        .clientX
                        - rect.left
                    )
                    * scaleX,

                y:
                    (
                        event
                        .touches[0]
                        .clientY
                        - rect.top
                    )
                    * scaleY

            };

        }


        return {

            x:
                (
                    event.clientX
                    - rect.left
                )
                * scaleX,

            y:
                (
                    event.clientY
                    - rect.top
                )
                * scaleY

        };

    }


    function startDrawing(
        event
    ) {

        event.preventDefault();


        pad.drawing =
            true;


        const position =
            getPosition(
                event
            );


        ctx.beginPath();


        ctx.moveTo(
            position.x,
            position.y
        );

    }


    function draw(
        event
    ) {

        if (!pad.drawing) {

            return;

        }


        event.preventDefault();


        pad.hasSignature =
            true;


        const position =
            getPosition(
                event
            );


        ctx.lineTo(
            position.x,
            position.y
        );


        ctx.stroke();

    }


    function stopDrawing(
        event
    ) {

        if (event) {

            event.preventDefault();

        }


        pad.drawing =
            false;


        ctx.closePath();

    }


    canvas.addEventListener(
        "mousedown",
        startDrawing
    );


    canvas.addEventListener(
        "mousemove",
        draw
    );


    canvas.addEventListener(
        "mouseup",
        stopDrawing
    );


    canvas.addEventListener(
        "mouseleave",
        stopDrawing
    );


    canvas.addEventListener(
        "touchstart",
        startDrawing
    );


    canvas.addEventListener(
        "touchmove",
        draw
    );


    canvas.addEventListener(
        "touchend",
        stopDrawing
    );


    clearButton.addEventListener(
        "click",
        () => {

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );


            pad.hasSignature =
                false;

        }
    );

}


export function getSignatureValue(
    field
) {

    const pad =
        signaturePads[
            field.field_key
        ];


    if (!pad) {

        return "";

    }


    if (!pad.hasSignature) {

        return "";

    }


    return pad.canvas.toDataURL(
        "image/png"
    );

}


export function hasSignature(
    fieldKey
) {

    const pad =
        signaturePads[
            fieldKey
        ];


    return Boolean(
        pad
        &&
        pad.hasSignature
    );

}