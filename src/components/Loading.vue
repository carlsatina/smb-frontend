<template>
    <div class="root">
            <teleport to="body">
                <transition name="fade" appear>
                <div class="modal" @keyup.esc="close" tabindex="0">
                    <div class="modal-container text-center" ref="modal" >
                        <img src="@/assets/loading.gif" width="80"/>
                    </div>
                </div>
                </transition>
            </teleport>
    </div>
</template>

<script>
import { onClickOutside } from '@vueuse/core'
import { ref, defineProps } from 'vue'

export default {
    name: 'Loading',
    setup(props, { emit }) {
        const modal = ref(null)

        return {
            modal
        }


    },
};
</script>

<style lang="scss" scoped>
.modal {
    position: fixed;
    top: 0;
    left: 0;
    background-color: rgba(0,0,0,0.2);
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
}

.modal-container {
    background-color: transparent;
    padding: 25px 30px 30px;
    border-radius: 10px;
    width: 550px;
}

.fade-enter-active,
.fade-leave-active {
    transition: all 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

</style>