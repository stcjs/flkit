import Base from '../../util/base.js';

/**
 * compress css
 */
export default class CssCompress extends Base {
  /**
   * constructor
   */
  constructor(text, options = {}){
    super('', options);
    this._optText = text;
    this.tokens = [];
    this.options = {};
    this.result = [];
    this.index = 0;
    this.length = 0;

    this.token = null;
    this.prev = null;
    this.next = null;
  }
  /**
   * run
   */
  run(){
    return this._optText;
  }
}