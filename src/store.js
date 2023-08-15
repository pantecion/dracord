import { defineStore } from 'pinia';

export const useDracordStore = defineStore('dracord', {
    state() {
        return {
            user: null
        }
    },
    actions: {
        setUser(user) {
            this.user = user;
        },
        reset() {
            this.user = null;
        }
    }
});
