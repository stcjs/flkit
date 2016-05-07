
import Base from './base.js';

export default class extends Base {
/**
 * check token has output
 */
 hasOutput(token){
    let code = token.value.trim().charCodeAt(0);
    return code === 0x24; //$
  }
  /**
   * get template matched
   */
  getMatched(ld, rd, tokenizeInstance){
    return this._getMatched(ld, rd, tokenizeInstance, {
      nest: true
    });
  }
}