import {
    apiRequest,
    setAccessToken,
    clearAccessToken,
    getAccessToken
} from "./api.js";


// ======================================================
// LOGIN
// ======================================================

export async function login(
    email,
    password
) {

    const response =
        await fetch(
            "/api/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        email,
                        password
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail
            || "Login failed."
        );

    }


    if (!data.access_token) {

        throw new Error(
            "Server did not return an access token."
        );

    }


    setAccessToken(
        data.access_token
    );


    return data;
}


// ======================================================
// LOGOUT
// ======================================================

export function logout() {

    clearAccessToken();

}


// ======================================================
// LOGIN STATE
// ======================================================

export function isLoggedIn() {

    return Boolean(
        getAccessToken()
    );

}


// ======================================================
// VERIFY EXISTING TOKEN
// ======================================================

export async function verifySession() {

    if (!getAccessToken()) {

        return false;

    }


    try {

        const response =
            await apiRequest(
                "/api/user/templates"
            );


        if (!response.ok) {

            clearAccessToken();

            return false;

        }


        return true;

    }

    catch (error) {

        clearAccessToken();

        return false;

    }

}