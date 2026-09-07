let accessToken =
    localStorage.getItem(
        "access_token"
    );


export function getAccessToken() {

    return accessToken;

}


export function setAccessToken(
    token
) {

    accessToken = token;

    localStorage.setItem(
        "access_token",
        token
    );

}


export function clearAccessToken() {

    accessToken = null;

    localStorage.removeItem(
        "access_token"
    );

}


export async function apiRequest(
    url,
    options = {}
) {

    const headers = {
        ...(options.headers || {})
    };


    if (accessToken) {

        headers[
            "Authorization"
        ] =
            `Bearer ${accessToken}`;

    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    return response;

}