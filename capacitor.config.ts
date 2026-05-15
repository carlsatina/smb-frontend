import { CapacitorConfig } from '@capacitor/cli';
import * as dotenv from 'dotenv';

const config: CapacitorConfig = {
    appId: 'com.rolero.quickworks',
    appName: 'Quickworks',
    webDir: 'dist',
    // server: {
    //     url: '192.168.2.195:8080',
    //     cleartext: true
    // },
    plugins: {
        GoogleAuth: {
            clientId: '1030438905076-4pgaqbi73u4sarm2c9o365g39s39tknm.apps.googleusercontent.com' || '',
            scopes: [
                'profile',
                'email'
            ],
            serverClientId: '1030438905076-4pgaqbi73u4sarm2c9o365g39s39tknm.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
};

export default config;
