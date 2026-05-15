<template>
    <VerifyEmailWeb v-if="!platformIsMobile" />
    <VerifyEmailMobile v-else />
</template>

<script>
import { ref } from 'vue'
import isPlatformMobile from '@/composables/platform'
import VerifyEmailWeb from '@/views/web/Auth/VerifyEmail.vue'
import VerifyEmailMobile from '@/views/mobile/Auth/VerifyEmail.vue'

export default {
    name: 'VerifyEmail',
    components: {
        VerifyEmailWeb,
        VerifyEmailMobile,
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
