import * as jose from "jose";


export default class Storage {
    #service;
    static TOKEN_KEY = "_auth_token_key";
    static REFRESH_TOKEN_KEY = "_auth_refresh_token_key";

    constructor(service) {
        this.#service = service;
    }

    getTokenKey() {
        let key = Storage.TOKEN_KEY;

        return this.#service.config.useSubDomainBaseStorage ?
            `${window.location.host}.${key}` : key;
    }

    getRefreshTokenKey() {
        let key = Storage.REFRESH_TOKEN_KEY;

        return this.#service.config.useSubDomainBaseStorage ?
            `${window.location.host}.${key}` : key;
    }

    getToken() {
        return localStorage.getItem(this.getTokenKey());
    }

    verifyToken() {
        return this.verifyJWT(this.getToken());
    }

    hasToken() {
        return this.getToken() !== null;
    }

    setToken(token) {
        localStorage.setItem(this.getTokenKey(), token);
    }

    removeToken() {
        localStorage.removeItem(this.getTokenKey());
    }

    getRefreshToken() {
        return localStorage.getItem(this.getRefreshTokenKey());
    }

    verifyRefreshToken() {
        return this.verifyJWT(this.getRefreshToken());
    }

    hasRefreshToken() {
        return this.getRefreshToken() !== null;
    }

    setRefreshToken(refreshToken) {
        localStorage.setItem(this.getRefreshTokenKey(), refreshToken);
    }

    removeRefreshToken() {
        localStorage.removeItem(this.getRefreshTokenKey());
    }

    remove() {
        this.removeToken();
        this.removeRefreshToken();
    }

    verifyJWT(token) {
        let decoded;

        try {
            decoded = jose.decodeJwt(token);
        } catch (e) {
            return false;
        }

        if (!decoded) {
            return false;
        }

        return Date.now() < decoded.exp * 1000;
    }
}
