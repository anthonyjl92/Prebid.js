/**
 * This module adds 33acrossId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/33acrossIdSystem
 * @requires module:modules/userId
 */

import { logMessage, logError, getWindowSelf } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = '33acrossId';
const API_URL = 'https://lexicon.33across.com/v1/envelope';
const AJAX_TIMEOUT = 10000;
const CALLER_NAME = 'pbjs';

function getEnvelope(response) {
  if (!response.succeeded) {
    if (response.error == 'Cookied User') {
      logMessage(`${MODULE_NAME}: Unsuccessful response`.concat(' ', response.error));
    } else {
      logError(`${MODULE_NAME}: Unsuccessful response`.concat(' ', response.error));
    }
    return;
  }

  if (!response.data.envelope) {
    logMessage(`${MODULE_NAME}: No envelope was received`);

    return;
  }

  return response.data.envelope;
}

function calculateQueryStringParams(pid, gdprConsentData) {
  const uspString = uspDataHandler.getConsentData();
  const gdprApplies = Boolean(gdprConsentData?.gdprApplies);
  const coppaValue = coppaDataHandler.getCoppa();
  const gppConsent = gppDataHandler.getConsentData();
  const viewportDimensions = getViewportDimensions();
  const viewportWidth = viewportDimensions?.w;
  const viewportHeight = viewportDimensions?.h;
  const screenDimensions = getScreenDimensions();
  const screenDimensionsWidth = screenDimensions?.w;
  const screenDimensionsHeight = screenDimensions?.h;

  const params = {
    pid,
    gdpr: Number(gdprApplies),
    src: CALLER_NAME,
    ver: '$prebid.version$',
    coppa: Number(coppaValue)
  };

  if (uspString) {
    params.us_privacy = uspString;
  }

  if (gppConsent) {
    const { gppString = '', applicableSections = [] } = gppConsent;

    params.gpp = gppString;
    params.gpp_sid = encodeURIComponent(applicableSections.join(','))
  }

  if (gdprConsentData?.consentString) {
    params.gdpr_consent = gdprConsentData.consentString;
  }

  if (viewportWidth) {
    params.vpw = viewportWidth;
  }

  if (viewportHeight) {
    params.vph = viewportHeight;
  }

  if (screenDimensionsWidth) {
    params.scw = screenDimensionsWidth;
  }

  if (screenDimensionsHeight) {
    params.sch = screenDimensionsHeight;
  }

  return params;
}

function getTopMostAccessibleWindow() {
  let mostAccessibleWindow = getWindowSelf();

  try {
    while (mostAccessibleWindow.parent !== mostAccessibleWindow &&
      mostAccessibleWindow.parent.document) {
      mostAccessibleWindow = mostAccessibleWindow.parent;
    }
  } catch (err) {
    // Do not throw an exception if we can't access the topmost frame.
  }

  return mostAccessibleWindow;
}

function getViewportDimensions() {
  const topWin = getTopMostAccessibleWindow();
  const documentProperty = topWin?.document;

  return {
    w: topWin?.innerWidth || documentProperty?.documentElement?.clientWidth || documentProperty?.body?.clientWidth,
    h: topWin?.innerHeight || documentProperty?.documentElement?.clientHeight || documentProperty?.body?.clientHeight
  };
}

function getScreenDimensions() {
  const {
    screen
  } = getWindowSelf();

  return {
    w: screen?.width,
    h: screen?.height,
  };
}

/** @type {Submodule} */
export const thirthyThreeAcrossIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  gvlid: 58,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} id
   * @returns {{'33acrossId':{ envelope: string}}}
   */
  decode(id) {
    return {
      [MODULE_NAME]: {
        envelope: id
      }
    };
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId({ params = { } }, gdprConsentData) {
    if (typeof params.pid !== 'string') {
      logError(`${MODULE_NAME}: Submodule requires a partner ID to be defined`);

      return;
    }

    const { pid, apiUrl = API_URL } = params;

    return {
      callback(cb) {
        ajaxBuilder(AJAX_TIMEOUT)(apiUrl, {
          success(response) {
            let envelope;

            try {
              envelope = getEnvelope(JSON.parse(response))
            } catch (err) {
              logError(`${MODULE_NAME}: ID reading error:`, err);
            }
            cb(envelope);
          },
          error(err) {
            logError(`${MODULE_NAME}: ID error response`, err);

            cb();
          }
        }, calculateQueryStringParams(pid, gdprConsentData), { method: 'GET', withCredentials: true });
      }
    };
  },
  eids: {
    '33acrossId': {
      source: '33across.com',
      atype: 1,
      getValue: function(data) {
        return data.envelope;
      }
    },
  }
};

submodule('userId', thirthyThreeAcrossIdSubmodule);
