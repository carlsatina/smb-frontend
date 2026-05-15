<template>
    <ResetPasswordWeb v-if="!platformIsMobile" />
    <ResetPasswordMobile v-else />
</template>

<script>
import { ref } from 'vue'
import isPlatformMobile from '@/composables/platform'
import ResetPasswordWeb from '@/views/web/Auth/ResetPassword.vue'
import ResetPasswordMobile from '@/views/mobile/Auth/ResetPassword.vue'

export default {
    name: 'ResetPassword',
    components: {
        ResetPasswordWeb,
        ResetPasswordMobile,
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
