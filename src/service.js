import _ from "lodash";
import _axios from "axios";

import Storage from "./storage";
import Scheme from "./scheme";
import {useDracordStore} from "./store";

const DEFAULT_CONFIG = {
    // HTTP Auth token type
    type: 'bearer',

    // After login, auto fetch user
    autoFetchUser: true,

    // Use different storage naming for subdomains
    useSubDomainBaseStorage: false,

    // Redirect url for guest users for login
    loginUrl: '/login',

    // Redirect url for auth users when they try to reach guest pages
    homeUrl: '/home',

    // After login redirect, cache for the aut page url over query parameter
    redirectQueryName: 'redirect',

    // Set default auth for pages
    defaultAuth: false,
    
    // Login from url, you can pass refresh and access token over url query
    autoLoginFromUrlQuery: false,

    endpoints: {
        login: {
            url: '/api/auth/login', method: 'post',
            // Username Request Data Field Name
            usernameData: 'username',
            // Password Request Data Field Name
            passwordData: 'password',

            // Token Property field from response
            tokenProperty: 'access',

            // Refresh Token Property field from response
            refreshTokenProperty: 'refresh',
        },
        refresh: {
            url: '/api/auth/refresh', method: 'post',
            // Token Property field from response
            tokenProperty: 'access',
            refreshTokenProperty: 'refresh',
            refreshTokenData: 'refresh',
        },
        user: {
            url: '/api/auth/user', method: 'get',
            userData: 'user'
        },
        logout: {url: '/api/auth/logout', method: 'post'},
    }
}

export default class Auth {
    constructor({axios, router, config}) {
        axios = axios || _axios.create();

        this.httpClient = axios;
        this.router = router;
        this.config = _.merge({}, DEFAULT_CONFIG, config);
        this.storage = new Storage(this);
        this.store = useDracordStore();
        this.scheme = new Scheme(this, this.httpClient);
    }

    setup() {
        this.scheme.setupHttpclient();

        if (this.router) {
            this.scheme.setupForRouter();
        }
    }

    get user() {
        return this.store.user;
    }

    #getAfterLoginRedirectRoute() {
        let redirectQuery = this.router.currentRoute.value.query[this.config.redirectQueryName];

        if (this.router && redirectQuery) {
            return {path: redirectQuery};
        }

        return {path: this.config.homeUrl};
    }

    goToLoginAfterPage() {
        return this.router.push(this.#getAfterLoginRedirectRoute());
    }

    login(username, password, redirectAfter = true) {
        let response = this.scheme.login(username, password);

        if (redirectAfter) {
            response = response.then(() => {
                return this.goToLoginAfterPage();
            });
        }

        if (this.config.autoFetchUser) {
            response = response.then(() => {
                return this.fetchUser();
            });
        }

        return response;
    }

    fetchUser() {
        return this.scheme.fetchUser();
    }

    refreshToken() {
        return this.scheme.refreshToken();
    }

    logout() {
        return this.scheme.logout();
    }

    get loggedIn() {
        return this.storage.hasToken();
    }

    reset() {
        this.storage.remove();
        this.store.reset();
    }

    async verify() {
        return this.scheme.verify();
    }
}
