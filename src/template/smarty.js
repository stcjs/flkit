
import Base from './base.js';

export default class SmartyTemplate extends Base {
  /**
   * check token has output
   */
  hasOutput(token) {
    const code = token.value.trim().charCodeAt(0);
    return code === 0x24; // $
  }
  /**
   * get template matched
   */
  getMatched(ld, rd, tokenizeInstance) {
    return this._getMatched(ld, rd, tokenizeInstance, {
      nest: true
    });
  }
  /**
   * compress tpl token
   */
  compress(token) {
    const value = token.ext.value;
    // remove {=*$name*=}
    if (value[0] === '*') {
      return;
    }
    return token;
  }
}
