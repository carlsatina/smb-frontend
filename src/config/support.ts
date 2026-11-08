// Support contact details shown on the Help & Support page.
// Leave a value empty to show "Coming soon" instead of a link.
export const supportContact = {
    email: 'rc.satina@tigdesignsolutions.com',
    // TODO: Messenger link, e.g. 'https://m.me/your-page'
    messengerUrl: '',
    // TODO: phone number as customers should dial it, e.g. '+63 917 123 4567'
    phone: '',
    // Shown under the contact options so customers know when to expect a reply.
    responseNote: 'We usually reply within one business day.',
};

/** tel: link with spaces and dashes removed. */
export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
