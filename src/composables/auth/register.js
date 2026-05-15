import { ref } from 'vue'

const register = async(userInfo) => {
    const response = ref(null)
    const error = ref(null)

    try {
        const payload = {
            email: userInfo.email,
            password: userInfo.password,
            fullName: userInfo.full_name || userInfo.fullName || ''
        }
        const reqOptions = {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            credentials: "include",
            body: JSON.stringify({
                ...payload
            })
        }
        const data = await fetch(import.meta.env.VITE_BACKEND_API + '/api/v1/auth/register', reqOptions)
        response.value = await data.json()

    } catch (err) {
        error.value = err
    }
    return { response, error }
}

export default register
