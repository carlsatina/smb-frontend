<template>
    <ForgotPasswordWeb v-if="!platformIsMobile" />
    <ForgotPasswordMobile v-else />
</template>

<script>
import { ref } from 'vue'
import isPlatformMobile from '@/composables/platform'
import ForgotPasswordWeb from '@/views/web/Auth/ForgotPassword.vue'
import ForgotPasswordMobile from '@/views/mobile/Auth/ForgotPassword.vue'

export default {
    name: 'ForgotPassword',
    components: {
        ForgotPasswordWeb,
        ForgotPasswordMobile,
    },
    setup () {
        const platformIsMobile = ref(false)

        isPlatformMobile()
            .then((data) => {
                platformIsMobile.value = data
            })

        if (typeof document !== 'undefined') {
            document.querySelector('body').style.height = '60%'
        }

        return {
            platformIsMobile
        }
    }
}
</script>
