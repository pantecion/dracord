import _ from "lodash";

export default class Scheme {
    #service;

    constructor(service) {
        this.#service = service;
        this.interceptor = null;
    }

    #getConfig() {
        return this.#service.config;
    }

    #getEndpoints() {
        return this.#getConfig().endpoints;
    }

    #getEndpoint(name) {
        return this.#getEndpoints()[name];
    }

    login(username, password) {
        return this.#service.httpClient({
            method: this.#getEndpoint("login").method,
            url: this.#getEndpoint("login").url,
            data: {
                [this.#getEndpoint("login").usernameData]: username,
                [this.#getEndpoint("login").passwordData]: password,
            }
        }).then((response) => {
            this.updateTokensFromResponse(response);

            return response;
        });
    }

    updateTokensFromResponse(response) {
        let token = response.data[this.#getEndpoint("login").tokenProperty];
        let refreshToken = response.data[this.#getEndpoint("login").refreshTokenProperty];

        this.#service.storage.setToken(token);
        this.#service.storage.setRefreshToken(refreshToken);
    }

    fetchUser() {
        return this.#service.httpClient({
            method: this.#getEndpoint("user").method,
            url: this.#getEndpoint("user").url,
        }).then((response) => {
            let userData = this.#getEndpoint("user").userData;

            if (userData) {
                this.#service.store.setUser(response.data[this.#getEndpoint("user").userData]);
            } else {
                this.#service.store.setUser(response.data);
            }

            return response;
        }).catch((error) => {
            // If there is 5xx error, then don't reset keys
            if (error.response.status >= 400 && error.response.status < 500) {
                this.#service.reset();
            }
        });
    }

    refreshToken() {
        let token;

        if (this.#service.storage.hasRefreshToken()) {
            token = this.#service.storage.getRefreshToken();
        } else {
            token = this.#service.storage.getToken();
        }

        let {
            method,
            url,
            tokenProperty,
            refreshTokenProperty,
            refreshTokenData
        } = this.#getEndpoint("refresh");

        return this.#service.httpClient({
            method, url,
            data: {
                [refreshTokenData]: token
            },
            skipAuth: true
        }).then((response) => {
            let token = response.data[tokenProperty];
            let refreshToken = response.data[refreshTokenProperty];

            this.#service.storage.setToken(token);

            if (refreshToken) {
                this.#service.storage.setRefreshToken(refreshToken);
            } else {
                this.#service.storage.removeRefreshToken();
            }

            return response;
        }).catch(() => {
            this.#service.reset();
        });
    }

    logout() {
        let {
            method,
            url
        } = this.#getEndpoint("logout");

        if (url) {
            return this.#service.httpClient({
                method,
                url
            }).then((response) => {
                this.#service.reset();
                this.#service.router.push({path: this.#getConfig().loginUrl});

                return response;
            });
        }

        this.#service.reset();
        this.#service.router.push({path: this.#getConfig().loginUrl});

        return true;
    }

    getAuthHeader(token) {
        return `${_.capitalize(this.#getConfig().type)} ${token}`;
    }

    setupHttpclient() {
        this.interceptor = this.#service.httpClient.interceptors.request.use(
            async (config) => {
                if (config.skipAuth) {
                    return config;
                }

                if (config.headers["Authorization"]) {
                    return config;
                }

                if (!this.#service.loggedIn) {
                    return config
                }

                // Make sure, token is not expired
                await this.#service.verify();

                if (this.#service.storage.hasToken()) {
                    config.headers["Authorization"] = this.getAuthHeader(this.#service.storage.getToken());

                    return config;
                }

                return config;
            }
        )
    }

    removeHttpClient() {
        this.#service.httpClient.interceptor.request.eject(this.interceptor);
    }

    async verify() {
        // If verify token is null
        if (!this.#service.storage.hasToken()) {
            this.#service.reset();

            return false;
        }

        if (this.#service.storage.verifyToken()) {
            return true;
        } else {
            // If verify token has expired, check refresh token
            if (this.#service.storage.hasRefreshToken() && this.#service.storage.verifyRefreshToken()) {
                await (this.refreshToken().then(() => true));

                return true;
            }

            // Token and refresh token has expired, so make sure reset everything
            this.#service.reset();

            return false;
        }
    }

    #checkAuthRequirementForRoute(route) {
        if (route.meta.auth !== undefined) {
            return route.meta.auth === true;
        }

        // If default auth setting is enabled,
        // then force login page as not required authentication
        let status = this.#service.config.defaultAuth;
        let routePath = _.trimEnd(route.path, '/');
        let loginUrl = _.trimEnd(this.#service.config.loginUrl, '/');

        if (routePath === loginUrl) {
            status = false;
        }

        return status;
    }
    
    #setCredentialsFromUrl(route) {
        if (! this.#service.config.autoLoginFromUrlQuery) {
            return;
        }

        let {
            tokenProperty,
            refreshTokenProperty,
        } = this.#getEndpoint("refresh");

        let token = route.query[tokenProperty];
        let refreshToken = route.query[refreshTokenProperty];
        
        if (! token || !refreshToken) {
            return;
        }

        this.#service.storage.setToken(token);
        this.#service.storage.setRefreshToken(refreshToken);

        return true;
    }

    setupForRouter() {
        this.#service.router.beforeEach(async (to, from) => {
            if (this.#setCredentialsFromUrl(to)) {
                // Remove query string
                this.#service.router.replace(to.path);

                return false;
            }

            await this.#service.verify();

            if (this.#service.config.autoFetchUser && this.#service.loggedIn && !this.#service.user) {
                await this.#service.fetchUser();
            }

            let useAuth = this.#checkAuthRequirementForRoute(to);

            if (useAuth) {
                if (this.#service.loggedIn !== true) {
                    return {
                        path: this.#getConfig().loginUrl,
                        query: {
                            [this.#service.config.redirectQueryName]: to.path
                        }
                    };
                }
            }

            if (to.meta.auth === "guest") {
                if (this.#service.loggedIn === true) {
                    return {path: this.#getConfig().homeUrl};
                }
            }
        });
    }
}
