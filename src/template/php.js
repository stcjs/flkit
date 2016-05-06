
import Base from './base.js';

export default class extends Base {
  /**
   * check text has tpl
   * @type {Boolean}
   */
  hasTpl(ld: string, rd: string, text: string): boolean{
    return text.indexOf(ld) > -1;
  }
}