import {
    login,
    logout,
    verifySession
} from "./auth.js";


import {
    loadTemplates,
    selectTemplate,
    generateDocument
} from "./templates.js";


import {
    loadMyDocuments,
    downloadDocument
} from "./documents.js";


// ======================================================
// ELEMENTS
// ======================================================

const loginSection =
    document.getElementById(
        "loginSection"
    );


const applicationSection =
    document.getElementById(
        "applicationSection"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );


const loginStatus =
    document.getElementById(
        "loginStatus"
    );


const documentForm =
    document.getElementById(
        "documentForm"
    );


const generationStatus =
    document.getElementById(
        "generationStatus"
    );


const templateSelect =
    document.getElementById(
        "templateSelect"
    );


const refreshDocumentsButton =
    document.getElementById(
        "refreshDocumentsButton"
    );


// ======================================================
// AUTH UI
// ======================================================

function showLogin() {

    loginSection.classList.remove(
        "hidden"
    );


    applicationSection.classList.add(
        "hidden"
    );


    logoutButton.classList.add(
        "hidden"
    );

}


function showApplication() {

    loginSection.classList.add(
        "hidden"
    );


    applicationSection.classList.remove(
        "hidden"
    );


    logoutButton.classList.remove(
        "hidden"
    );

}


// ======================================================
// LOGIN FORM
// ======================================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        loginStatus.textContent =
            "Logging in...";


        const email =
            document.getElementById(
                "loginEmail"
            ).value.trim();


        const password =
            document.getElementById(
                "loginPassword"
            ).value;


        try {

            await login(
                email,
                password
            );


            loginStatus.textContent =
                "";


            showApplication();


            await loadApplication();

        }

        catch (error) {

            loginStatus.textContent =
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


        templateSelect.innerHTML =
            '<option value="">-- Select a template --</option>';


        document.getElementById(
            "dynamicFields"
        ).innerHTML =
            "";


        document.getElementById(
            "myDocuments"
        ).innerHTML =
            "";


        document.getElementById(
            "templateTitle"
        ).textContent =
            "Select a template.";


        document.getElementById(
            "generateButton"
        ).disabled =
            true;


        generationStatus.textContent =
            "";


        showLogin();

    }
);


// ======================================================
// TEMPLATE CHANGE
// ======================================================

templateSelect.addEventListener(
    "change",
    async event => {

        generationStatus.textContent =
            "";


        try {

            await selectTemplate(
                event.target.value
            );

        }

        catch (error) {

            generationStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// GENERATE DOCUMENT
// ======================================================

documentForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        generationStatus.textContent =
            "Generating document...";


        try {

            const result =
                await generateDocument();


            generationStatus.textContent =
                "Document generated successfully!\n"
                + "Text replacements: "
                + result.replacement_count
                + "\nSignature replacements: "
                + result.signature_count;


            await downloadDocument(
                result.download_url,
                result.filename
            );


            await loadMyDocuments();

        }

        catch (error) {

            generationStatus.textContent =
                "Error: "
                + error.message;

        }

    }
);


// ======================================================
// REFRESH HISTORY
// ======================================================

refreshDocumentsButton.addEventListener(
    "click",
    async () => {

        await loadMyDocuments();

    }
);


// ======================================================
// LOAD APP
// ======================================================

async function loadApplication() {

    await loadTemplates();

    await loadMyDocuments();

}


// ======================================================
// INITIALIZATION
// ======================================================

async function initialize() {

    const validSession =
        await verifySession();


    if (!validSession) {

        showLogin();

        return;

    }


    showApplication();


    try {

        await loadApplication();

    }

    catch (error) {

        generationStatus.textContent =
            "Initialization error: "
            + error.message;

    }

}


initialize();