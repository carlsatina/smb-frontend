import { reactive } from 'vue'

const state = reactive ({
    isUserLoggedIn: false,
    isUserAdmin: false,
    showSearchIcon: false
})

const methods = {
    loginUser(token, csrfToken) {
        if (token) {
            localStorage.setItem('accessToken', token)
            localStorage.setItem('token', token)
        }
        if (csrfToken) {
            localStorage.setItem('csrfToken', csrfToken)
        }
        state.isUserLoggedIn = true
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:login'))
        }
    },
    logoutUser() {
        localStorage.removeItem('token')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('csrfToken')
        state.isUserLoggedIn = false
    },
    isStrongPassword(password) {
        return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,20}$/.test(password)
    },
    isValidEmailFormat(email) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)
    },
    hasMinimumChar(text) {
        return /^[a-zA-Z0-9!@#\$%\^\&*\)\(+=._-]{8,20}$/.test(text)
    },
    setUserAdmin(val) {
        state.isUserAdmin = val
    },
    setSearchIcon(val) {
        state.showSearchIcon = val
    }
}

export default {
    state,
    methods
}
