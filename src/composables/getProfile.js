import { ref } from 'vue'

const getProfile = async(token) => {
    const response = ref(null)
    const error = ref(null)

    const bearerToken = token || localStorage.getItem('accessToken') || localStorage.getItem('token')
    if (!bearerToken) {
        error.value = new Error('Missing access token')
        return { response, error }
    }
    const bearer = "Bearer " + bearerToken
    try {
        const reqOptions = {
            method: "GET",
            headers: {"Content-Type":"application/json", "Authorization":bearer}
        }
        // const data = await fetch("http://localhost:5000/services", reqOptions)
        const data = await fetch(import.meta.env.VITE_BACKEND_API + '/api/v1/auth/me', reqOptions)
        const payload = await data.json()
        if (payload && payload.user) {
            response.value = {
                userInfo: {
                    id: payload.user.id,
                    full_name: payload.user.fullName || '',
                    email: payload.user.email,
                    is_admin: 0
                }
            }
        } else {
            response.value = payload
        }

    } catch (err) {
        error.value = err
    }
    return { response, error }
}

export default getProfile
