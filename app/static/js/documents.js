import {
    apiRequest
} from "./api.js";


export async function downloadDocument(
    downloadUrl,
    filename
) {

    const response =
        await apiRequest(
            downloadUrl
        );


    if (!response.ok) {

        throw new Error(
            "Could not download document."
        );

    }


    const blob =
        await response.blob();


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


// ======================================================
// LOAD HISTORY
// ======================================================

export async function loadMyDocuments() {

    const container =
        document.getElementById(
            "myDocuments"
        );


    container.textContent =
        "Loading documents...";


    try {

        const response =
            await apiRequest(
                "/api/user/documents"
            );


        if (!response.ok) {

            throw new Error(
                "Could not load documents."
            );

        }


        const data =
            await response.json();


        container.innerHTML =
            "";


        if (
            !data.documents
            ||
            data.documents.length === 0
        ) {

            container.textContent =
                "No generated documents yet.";


            return;

        }


        data.documents.forEach(
            generatedDocument => {

                container.appendChild(
                    createDocumentCard(
                        generatedDocument
                    )
                );

            }
        );

    }

    catch (error) {

        container.textContent =
            error.message;

    }

}


// ======================================================
// CARD
// ======================================================

function createDocumentCard(
    generatedDocument
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "document-card";


    const title =
        document.createElement(
            "h3"
        );


    title.textContent =
        generatedDocument
        .template_title;


    card.appendChild(
        title
    );


    const type =
        document.createElement(
            "p"
        );


    type.textContent =
        "Type: "
        + (
            generatedDocument
            .document_type
            || "document"
        );


    card.appendChild(
        type
    );


    const created =
        document.createElement(
            "p"
        );


    created.textContent =
        "Generated: "
        + new Date(
            generatedDocument
            .created_at
        ).toLocaleString();


    card.appendChild(
        created
    );


    const detailsButton =
        document.createElement(
            "button"
        );


    detailsButton.type =
        "button";


    detailsButton.className =
        "document-button";


    detailsButton.textContent =
        "View Details";


    detailsButton.addEventListener(
        "click",
        () => {

            toggleDocumentDetails(
                generatedDocument.id,
                card
            );

        }
    );


    card.appendChild(
        detailsButton
    );


    const downloadButton =
        document.createElement(
            "button"
        );


    downloadButton.type =
        "button";


    downloadButton.textContent =
        "Download";


    downloadButton.addEventListener(
        "click",
        async () => {

            try {

                await downloadDocument(
                    "/api/user/generated/"
                    + generatedDocument
                        .generated_filename,

                    generatedDocument
                        .generated_filename
                );

            }

            catch (error) {

                alert(
                    error.message
                );

            }

        }
    );


    card.appendChild(
        downloadButton
    );


    return card;

}


// ======================================================
// DETAILS
// ======================================================

async function toggleDocumentDetails(
    documentId,
    card
) {

    const existing =
        card.querySelector(
            ".document-details"
        );


    if (existing) {

        existing.remove();

        return;

    }


    try {

        const response =
            await apiRequest(
                `/api/user/documents/${documentId}`
            );


        if (!response.ok) {

            throw new Error(
                "Could not load document details."
            );

        }


        const data =
            await response.json();


        const details =
            document.createElement(
                "div"
            );


        details.className =
            "document-details";


        if (
            !data.values
            ||
            data.values.length === 0
        ) {

            details.textContent =
                "No saved values.";

        }

        else {

            data.values.forEach(
                field => {

                    const row =
                        document.createElement(
                            "p"
                        );


                    const label =
                        document.createElement(
                            "strong"
                        );


                    label.textContent =
                        `${field.label}: `;


                    row.appendChild(
                        label
                    );


                    row.appendChild(
                        document.createTextNode(
                            field.value ?? ""
                        )
                    );


                    details.appendChild(
                        row
                    );

                }
            );

        }


        card.appendChild(
            details
        );

    }

    catch (error) {

        alert(
            error.message
        );

    }

}