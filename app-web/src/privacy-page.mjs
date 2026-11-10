import './policy.css';
import { privacyContent } from './privacy-content.mjs';
// No Firebase SDK, account session, DB, App Check or analytics initialization.
document.querySelector('#policy').innerHTML = privacyContent(__PUBLIC_CONFIG__);
