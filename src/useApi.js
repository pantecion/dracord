import {inject} from "vue";

export const authKey = Symbol('');

export function useAuth() {
    return inject(authKey);
}
