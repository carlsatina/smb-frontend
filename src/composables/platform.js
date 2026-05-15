import { ref } from 'vue'
import { Device } from '@capacitor/device'

const isPlatformMobile = async () => {
    const device = await Device.getInfo()
    if (device.platform === 'android' || device.platform === 'ios') {
        return true;
    }
    return false;
}

export default isPlatformMobile