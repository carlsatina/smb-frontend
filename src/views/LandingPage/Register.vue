<template>
    <RegisterWeb v-if="!platformIsMobile"/>
    <RegisterMobile v-else/>
</template>


<script>
import { ref, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import store from '@/store'
import RegisterWeb from '@/views/web/Auth/Register.vue'
import RegisterMobile from '@/views/mobile/Auth/Register.vue'
import isPlatformMobile from '@/composables/platform'

export default {
    name: "Register",
    components: {
        RegisterWeb,
        RegisterMobile
    },
    setup () {
        const platformIsMobile = ref(false);
        provide('store', store)

        isPlatformMobile()
        .then((data) => {
            platformIsMobile.value = data
        })
        document.querySelector('body').style.height = '60%'
        return {
            store,
            platformIsMobile
        }
    }
}
</script>

<style>
#app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    height: 88vh;
    overflow: scroll;
}


</style>
