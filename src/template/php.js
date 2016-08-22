
import Base from './base.js';

export default class PHPTemplate extends Base {
  /**
   * check text has tpl
   * @type {Boolean}
   */
  hasTpl(text, ld/*, rd*/){
    return text.indexOf(ld) > -1;
  }
  /**
   * get template matched
   */
  getMatched(ld, rd, tokenizeInstance){
    return this._getMatched(ld, rd, tokenizeInstance, {
      ignoreEnd: true,
      quote: true,
      multiComment: true
    });
  }
}