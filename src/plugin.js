import Auth from "./service";
import {authKey} from "./useApi";

export default {
    install: (app, options) => {
        options = options || {
            axios: null,
            router: null,
            config: {}
        };

        if (!options.axios && app.config.globalProperties.$axios) {
            options.axios = app.config.globalProperties.$axios;
        }

        if (!options.router && app.config.globalProperties.$router) {
            options.router = app.config.globalProperties.$router;
        }

        let auth = new Auth(options);

        auth.setup();

        app.config.globalProperties.$auth = auth;
        app.provide(authKey, auth);
    }
}
