import {
    login,
    logout
} from "./auth.js";


import {
    uploadTemplate,
    extractTemplate,
    analyzeTemplate,
    getTemplateFields,
    createTemplateField,
    updateTemplateField,
    deleteTemplateField,
    publishTemplate
} from "./admin-api.js";


// ======================================================
// STATE
// ======================================================

let currentTemplateId =
    null;


// ======================================================
// ELEMENTS
// ======================================================

const loginSection =
    document.getElementById(
        "loginSection"
    );


const adminSection =
    document.getElementById(
        "adminSection"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const uploadForm =
    document.getElementById(
        "uploadForm"
    );


const uploadStatus =
    document.getElementById(
        "uploadStatus"
    );


const templateActionsSection =
    document.getElementById(
        "templateActionsSection"
    );


const templateStatus =
    document.getElementById(
        "templateStatus"
    );


const fieldsSection =
    document.getElementById(
        "fieldsSection"
    );


const fieldsContainer =
    document.getElementById(
        "fieldsContainer"
    );


// ======================================================
// UI
// ======================================================

function showLogin() {

    loginSection.classList.remove(
        "hidden"
    );


    adminSection.classList.add(
        "hidden"
    );


    logoutButton.classList.add(
        "hidden"
    );

}


function showAdmin() {

    loginSection.classList.add(
        "hidden"
    );


    adminSection.classList.remove(
        "hidden"
    );


    logoutButton.classList.remove(
        "hidden"
    );

}


// ======================================================
// LOGIN
// ======================================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            document.getElementById(
                "loginEmail"
            ).value.trim();


        const password =
            document.getElementById(
                "loginPassword"
            ).value;


        const status =
            document.getElementById(
                "loginStatus"
            );


        status.textContent =
            "Logging in...";


        try {

            await login(
                email,
                password
            );


            status.textContent =
                "";


            showAdmin();

        }

        catch (error) {

            status.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// LOGOUT
// ======================================================

logoutButton.addEventListener(
    "click",
    () => {

        logout();


        currentTemplateId =
            null;


        templateActionsSection.classList.add(
            "hidden"
        );


        fieldsSection.classList.add(
            "hidden"
        );


        showLogin();

    }
);


// ======================================================
// UPLOAD
// ======================================================

uploadForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const title =
            document.getElementById(
                "templateTitleInput"
            ).value.trim();


        const fileInput =
            document.getElementById(
                "templateFile"
            );


        if (!fileInput.files.length) {

            uploadStatus.textContent =
                "Please select a DOCX file.";

            return;

        }


        uploadStatus.textContent =
            "Uploading template...";


        try {

            const result =
                await uploadTemplate(
                    title,
                    fileInput.files[0]
                );


            currentTemplateId =
                result.id
                ?? result.template_id;


            if (!currentTemplateId) {

                throw new Error(
                    "Upload succeeded but no template ID was returned."
                );

            }


            document.getElementById(
                "currentTemplateId"
            ).textContent =
                currentTemplateId;


            templateActionsSection.classList.remove(
                "hidden"
            );


            uploadStatus.textContent =
                "Template uploaded successfully.";

        }

        catch (error) {

            uploadStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// EXTRACT
// ======================================================

document
.getElementById(
    "extractButton"
)
.addEventListener(
    "click",
    async () => {

        if (!currentTemplateId) {

            return;

        }


        templateStatus.textContent =
            "Extracting document text...";


        try {

            const result =
                await extractTemplate(
                    currentTemplateId
                );


            const content =
                result.combined_text
                ?? result.text
                ?? JSON.stringify(
                    result,
                    null,
                    2
                );


            document.getElementById(
                "extractedContent"
            ).textContent =
                content;


            document.getElementById(
                "extractionSection"
            ).classList.remove(
                "hidden"
            );


            templateStatus.textContent =
                "Extraction completed.";

        }

        catch (error) {

            templateStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// AI ANALYZE
// ======================================================

document
.getElementById(
    "analyzeButton"
)
.addEventListener(
    "click",
    async () => {

        if (!currentTemplateId) {

            return;

        }


        templateStatus.textContent =
            "AI is analyzing the template...";


        try {

            const result =
                await analyzeTemplate(
                    currentTemplateId
                );


            templateStatus.textContent =
                "AI analysis completed.";


            console.log(
                "Analysis:",
                result
            );


            await loadFields();

        }

        catch (error) {

            templateStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// LOAD FIELDS BUTTON
// ======================================================

document
.getElementById(
    "loadFieldsButton"
)
.addEventListener(
    "click",
    loadFields
);


// ======================================================
// LOAD FIELDS
// ======================================================

async function loadFields() {

    if (!currentTemplateId) {

        return;

    }


    templateStatus.textContent =
        "Loading fields...";


    try {

        const result =
            await getTemplateFields(
                currentTemplateId
            );


        const fields =
            result.fields
            ?? result;


        renderFields(
            fields
        );


        fieldsSection.classList.remove(
            "hidden"
        );


        templateStatus.textContent =
            "Fields loaded.";

    }

    catch (error) {

        templateStatus.textContent =
            "Error: "
            + error.message;

    }

}


// ======================================================
// RENDER ADMIN FIELD CARDS
// ======================================================

function renderFields(
    fields
) {

    fieldsContainer.innerHTML =
        "";


    if (
        !fields
        ||
        fields.length === 0
    ) {

        fieldsContainer.textContent =
            "No fields detected.";

        return;

    }


    fields.forEach(
        field => {

            fieldsContainer.appendChild(
                createFieldCard(
                    field
                )
            );

        }
    );

}


// ======================================================
// FIELD CARD
// ======================================================

function createFieldCard(
    field
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "admin-field-card";


    const grid =
        document.createElement(
            "div"
        );


    grid.className =
        "admin-field-grid";


    const keyInput =
        createInput(
            "Field Key",
            field.field_key
        );


    const labelInput =
        createInput(
            "Label",
            field.label
        );


    const typeInput =
        createTypeSelect(
            field.field_type
        );


    const sourceInput =
        createInput(
            "Source Text",
            field.placeholder_text
            ?? field.source_text
            ?? ""
        );


    grid.appendChild(
        keyInput.wrapper
    );


    grid.appendChild(
        labelInput.wrapper
    );


    grid.appendChild(
        typeInput.wrapper
    );


    grid.appendChild(
        sourceInput.wrapper
    );


    card.appendChild(
        grid
    );


    const requiredWrapper =
        document.createElement(
            "div"
        );


    requiredWrapper.className =
        "field";


    const requiredCheckbox =
        document.createElement(
            "input"
        );


    requiredCheckbox.type =
        "checkbox";


    requiredCheckbox.checked =
        Boolean(
            field.required
        );


    requiredCheckbox.style.width =
        "auto";


    const requiredLabel =
        document.createElement(
            "label"
        );


    requiredLabel.textContent =
        " Required";


    requiredLabel.style.display =
        "inline";


    requiredWrapper.appendChild(
        requiredCheckbox
    );


    requiredWrapper.appendChild(
        requiredLabel
    );


    card.appendChild(
        requiredWrapper
    );


    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "admin-field-actions";


    const saveButton =
        document.createElement(
            "button"
        );


    saveButton.type =
        "button";


    saveButton.textContent =
        "Save";


    saveButton.addEventListener(
        "click",
        async () => {

            try {

                await updateTemplateField(
                    currentTemplateId,
                    field.id,
                    {
                        field_key:
                            keyInput.input.value.trim(),

                        label:
                            labelInput.input.value.trim(),

                        field_type:
                            typeInput.input.value,

                        required:
                            requiredCheckbox.checked,

                        source_text:
                            sourceInput.input.value.trim()
                    }
                );


                templateStatus.textContent =
                    "Field updated.";

            }

            catch (error) {

                templateStatus.textContent =
                    "Error: "
                    + error.message;

            }

        }
    );


    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";


    deleteButton.textContent =
        "Delete";


    deleteButton.className =
        "delete-button";


    deleteButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "Delete this field?"
                );


            if (!confirmed) {

                return;

            }


            try {

                await deleteTemplateField(
                    currentTemplateId,
                    field.id
                );


                await loadFields();

            }

            catch (error) {

                templateStatus.textContent =
                    "Error: "
                    + error.message;

            }

        }
    );


    actions.appendChild(
        saveButton
    );


    actions.appendChild(
        deleteButton
    );


    card.appendChild(
        actions
    );


    return card;
}


// ======================================================
// INPUT HELPERS
// ======================================================

function createInput(
    labelText,
    value
) {

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
        labelText;


    const input =
        document.createElement(
            "input"
        );


    input.type =
        "text";


    input.value =
        value ?? "";


    wrapper.appendChild(
        label
    );


    wrapper.appendChild(
        input
    );


    return {
        wrapper,
        input
    };

}


function createTypeSelect(
    value
) {

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
        "Field Type";


    const select =
        document.createElement(
            "select"
        );


    const types = [
        "text",
        "email",
        "number",
        "date",
        "textarea",
        "signature"
    ];


    types.forEach(
        type => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                type;


            option.textContent =
                type;


            option.selected =
                type === value;


            select.appendChild(
                option
            );

        }
    );


    wrapper.appendChild(
        label
    );


    wrapper.appendChild(
        select
    );


    return {
        wrapper,
        input: select
    };

}


// ======================================================
// ADD FIELD
// ======================================================

document
.getElementById(
    "addFieldButton"
)
.addEventListener(
    "click",
    async () => {

        if (!currentTemplateId) {

            return;

        }


        const fieldKey =
            prompt(
                "Field key, e.g. recipient_name"
            );


        if (!fieldKey) {

            return;

        }


        const label =
            prompt(
                "Field label"
            );


        if (!label) {

            return;

        }


        const sourceText =
            prompt(
                "Exact source text in DOCX"
            );


        if (!sourceText) {

            return;

        }


        try {

            await createTemplateField(
                currentTemplateId,
                {
                    field_key:
                        fieldKey.trim(),

                    label:
                        label.trim(),

                    field_type:
                        "text",

                    required:
                        true,

                    source_text:
                        sourceText.trim()
                }
            );


            await loadFields();

        }

        catch (error) {

            templateStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// PUBLISH
// ======================================================

document
.getElementById(
    "publishButton"
)
.addEventListener(
    "click",
    async () => {

        if (!currentTemplateId) {

            return;

        }


        templateStatus.textContent =
            "Publishing template...";


        try {

            await publishTemplate(
                currentTemplateId
            );


            templateStatus.textContent =
                "Template published successfully.";

        }

        catch (error) {

            templateStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// INITIAL STATE
// ======================================================

showLogin();