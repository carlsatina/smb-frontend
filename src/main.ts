import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

import 'css-ripple-effect/dist/ripple.min.css';
import '@vuepic/vue-datepicker/dist/main.css';
import './assets/tailwind.css';
import './styles/common.css';

import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

const app = createApp(App);

app.use(createPinia());
app.use(mdiVue, { icons: mdijs });
app.use(router);
app.mount('#app');
