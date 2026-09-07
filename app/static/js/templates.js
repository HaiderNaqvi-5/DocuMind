import {
    apiRequest
} from "./api.js";


import {
    createSignatureField,
    clearSignaturePads,
    getSignatureValue,
    hasSignature
} from "./signature.js";


let selectedTemplateId =
    null;


let templateFields = [];


export function getSelectedTemplateId() {

    return selectedTemplateId;

}


export function getTemplateFields() {

    return templateFields;

}


// ======================================================
// LOAD PUBLISHED TEMPLATES
// ======================================================

export async function loadTemplates() {

    const select =
        document.getElementById(
            "templateSelect"
        );


    const response =
        await apiRequest(
            "/api/user/templates"
        );


    if (!response.ok) {

        throw new Error(
            "Could not load templates."
        );

    }


    const data =
        await response.json();


    select.innerHTML =
        '<option value="">-- Select a template --</option>';


    if (
        !data.templates
        ||
        data.templates.length === 0
    ) {

        select.innerHTML =
            '<option value="">No published templates</option>';


        return;

    }


    data.templates.forEach(
        template => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                template.id;


            option.textContent =
                template.title;


            select.appendChild(
                option
            );

        }
    );

}


// ======================================================
// SELECT TEMPLATE
// ======================================================

export async function selectTemplate(
    templateId
) {

    if (!templateId) {

        selectedTemplateId =
            null;


        templateFields =
            [];


        document.getElementById(
            "dynamicFields"
        ).innerHTML = "";


        document.getElementById(
            "templateTitle"
        ).textContent =
            "Select a template.";


        document.getElementById(
            "generateButton"
        ).disabled =
            true;


        return;

    }


    selectedTemplateId =
        Number(
            templateId
        );


    await loadTemplate(
        selectedTemplateId
    );

}


// ======================================================
// LOAD ONE TEMPLATE
// ======================================================

async function loadTemplate(
    templateId
) {

    const response =
        await apiRequest(
            `/api/user/templates/${templateId}`
        );


    if (!response.ok) {

        throw new Error(
            "Could not load template."
        );

    }


    const data =
        await response.json();


    templateFields =
        data.fields;


    document.getElementById(
        "templateTitle"
    ).textContent =
        data.title;


    renderFields(
        templateFields
    );


    document.getElementById(
        "generateButton"
    ).disabled =
        false;

}


// ======================================================
// RENDER FIELDS
// ======================================================

function renderFields(
    fields
) {

    const container =
        document.getElementById(
            "dynamicFields"
        );


    container.innerHTML =
        "";


    clearSignaturePads();


    fields.forEach(
        field => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "field";


            const label =
                document.createElement(
                    "label"
                );


            label.textContent =
                field.label
                + (
                    field.required
                        ? " *"
                        : ""
                );


            wrapper.appendChild(
                label
            );


            if (
                field.field_type
                === "signature"
            ) {

                createSignatureField(
                    field,
                    wrapper
                );

            }

            else {

                createNormalField(
                    field,
                    wrapper
                );

            }


            container.appendChild(
                wrapper
            );

        }
    );

}


// ======================================================
// NORMAL FIELD
// ======================================================

function createNormalField(
    field,
    wrapper
) {

    let input;


    if (
        field.field_type
        === "textarea"
    ) {

        input =
            document.createElement(
                "textarea"
            );

    }

    else {

        input =
            document.createElement(
                "input"
            );


        const typeMap = {

            email: "email",

            number: "number",

            date: "date",

            text: "text"

        };


        input.type =
            typeMap[
                field.field_type
            ]
            || "text";

    }


    input.id =
        field.field_key;


    input.name =
        field.field_key;


    input.required =
        field.required;


    wrapper.appendChild(
        input
    );

}


// ======================================================
// READ FORM VALUES
// ======================================================

export function collectTemplateValues() {

    const values = {};


    for (
        const field
        of templateFields
    ) {

        if (
            field.field_type
            === "signature"
        ) {

            if (
                field.required
                &&
                !hasSignature(
                    field.field_key
                )
            ) {

                throw new Error(
                    `Please complete: ${field.label}`
                );

            }


            values[
                field.field_key
            ] =
                getSignatureValue(
                    field
                );


            continue;

        }


        const element =
            document.getElementById(
                field.field_key
            );


        const value =
            element.value.trim();


        if (
            field.required
            &&
            !value
        ) {

            element.focus();


            throw new Error(
                `Please complete: ${field.label}`
            );

        }


        values[
            field.field_key
        ] =
            value;

    }


    return values;

}


// ======================================================
// GENERATE
// ======================================================

export async function generateDocument() {

    if (!selectedTemplateId) {

        throw new Error(
            "Please select a template."
        );

    }


    const values =
        collectTemplateValues();


    const response =
        await apiRequest(
            `/api/user/templates/${selectedTemplateId}/generate`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        values
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            typeof data.detail === "string"
                ? data.detail
                : JSON.stringify(
                    data.detail
                )
        );

    }


    return data;

}