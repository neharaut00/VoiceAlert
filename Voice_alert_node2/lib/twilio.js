// internal dependencies
const config = require('./config/appengine');
// logging
const log = require('loglevel');


/**
 * hostname for this application
 * @type {string}
 */
let HOSTNAME;



/**
 * Logs the configuration being used by this module.
 */
function init() {
    // log current config to help with debugging
  // HOSTNAME = config.getHostname();
  HOSTNAME = "localhost";
    log.debug('Twilio setup:', { HOSTNAME });
}


/**
 * Generates the XML for a TwiML Bin that will route a phone call to the
 *  provided number.
 *
 * @param {string} receiverPhoneNumber - phone number to direct the call to
 *
 * @returns {string} XML for a TwiML Bin that will route the phone call to the
 *   provided number, while forwarding the audio to the websocket endpoints
 *   hosted by this application
 */
function generateTwimlBin(receiverPhoneNumber) {
  log.debug('generateTwimlBin', { receiverPhoneNumber })
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>

  <Start>
    <Stream url="wss://${HOSTNAME}/ws/caller"   track="inbound_track"/>
  </Start>
  <Start>
    <Stream url="wss://${HOSTNAME}/ws/receiver" track="outbound_track"/>
  </Start>
  <Dial>
    +91${receiverPhoneNumber}
  </Dial>
  <Pause length="40"/>
</Response>`;
}


module.exports = {
    init,
    generateTwimlBin
};