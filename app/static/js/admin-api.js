import {
    apiRequest
} from "./api.js";


// ======================================================
// UPLOAD
// ======================================================

export async function uploadTemplate(
    title,
    file
) {

    const formData =
        new FormData();


    formData.append(
        "title",
        title
    );


    formData.append(
        "file",
        file
    );


    const response =
        await apiRequest(
            "/api/admin/templates/upload",
            {
                method: "POST",

                body: formData
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "Upload failed."
        );

    }


    return data;
}


// ======================================================
// EXTRACT
// ======================================================

export async function extractTemplate(
    templateId
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/extract`
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "Extraction failed."
        );

    }


    return data;
}


// ======================================================
// ANALYZE
// ======================================================

export async function analyzeTemplate(
    templateId
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/analyze`,
            {
                method: "POST"
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "AI analysis failed."
        );

    }


    return data;
}


// ======================================================
// LOAD FIELDS
// ======================================================

export async function getTemplateFields(
    templateId
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/fields`
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "Could not load fields."
        );

    }


    return data;
}


// ======================================================
// CREATE FIELD
// ======================================================

export async function createTemplateField(
    templateId,
    payload
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/fields`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
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


// ======================================================
// UPDATE FIELD
// ======================================================

export async function updateTemplateField(
    templateId,
    fieldId,
    payload
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/fields/${fieldId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
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


// ======================================================
// DELETE FIELD
// ======================================================

export async function deleteTemplateField(
    templateId,
    fieldId
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/fields/${fieldId}`,
            {
                method: "DELETE"
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "Could not delete field."
        );

    }


    return data;
}


// ======================================================
// PUBLISH
// ======================================================

export async function publishTemplate(
    templateId
) {

    const response =
        await apiRequest(
            `/api/admin/templates/${templateId}/publish`,
            {
                method: "POST"
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "Could not publish template."
        );

    }


    return data;
}