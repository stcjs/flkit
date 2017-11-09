
import util from 'util';

import Message from './message.js';
import BaseTemplate from '../template/base.js';
import PHPTemplate from '../template/php.js';
import SmartyTemplate from '../template/smarty.js';
import Err from './error.js';

const isArray = Array.isArray;

const templates = {
  php: PHPTemplate,
  smarty: SmartyTemplate
};

export default class Base {
  /**
   * constructor
   * @param  {String} text    []
   * @param  {Object} options []
   * @return {}         []
   */
  constructor(text = '', options = {
    tpl: '',
    ld: [],
    rd: []
  }) {
    this.text = this.clean(text);
    this._text = this.text.toLowerCase(); // text lowercase
    this.length = this.text.length;
    this.options = options;

    this.initTpl();
    this._hasTpl = this.hasTpl();
  }
  /**
   * remove unnecessary chars in text
   * @param  {String} text [source text]
   * @return {String}      [cleaned text]
   */
  clean(text) {
    // \uFEFF is BOM char
    return text.replace(/\r\n?|[\n\u2028\u2029]/g, '\n').replace(/\uFEFF/g, '');
  }
  /**
   * init tpl
   * @return {} []
   */
  initTpl() {
    this.tpl = (this.options.tpl || '').toLowerCase();
    if (!this.tpl || !this.options.ld) {
      this.ld = [];
      this.rd = [];
      return;
    }
    let ld = this.options.ld;
    let rd = this.options.rd;
    if (!isArray(ld)) {
      ld = [ld];
      rd = [rd];
    }
    ld = ld.filter(item => item);
    rd = rd.filter(item => item);
    if (ld.length !== rd.length) {
      throw new Error(Message.DelimiterNotEqual);
    }
    this.ld = ld;
    this.rd = rd;
  }
  /**
   * check text has tpl
   * @return {Boolean}      []
   */
  hasTpl(text) {
    if (!this.tpl || !this.ld.length) {
      return false;
    }
    const tplInstance = this.getTplInstance();
    for (var i = 0, length = this.ld.length, ld, rd; i < length; i++) {
      ld = this.ld[i];
      rd = this.rd[i];
      if (tplInstance.hasTpl(text || this.text, ld, rd)) {
        return true;
      }
    }
    return false;
  }
  /**
   * throw error
   * @param  {[type]} message:    string        [description]
   * @param  {[type]} line?:      number        [description]
   * @param  {[type]} col?:number [description]
   * @param  {[type]} data?:any   [description]
   * @return {[type]}             [description]
   */
  error(message, line, col, data) {
    if (isArray(line)) {
      data = line;
      line = undefined;
    }
    if (line === undefined && this.line !== undefined) {
      line = this.line;
      col = this.col;
    }
    if (isArray(data)) {
      message = util.format.call(null, data.unshift(message));
    }
    throw new Err(message, line, col);
  }
  /**
   * get template instance
   * @return {}       []
   */
  getTplInstance() {
    let cls = BaseTemplate;
    if (this.tpl && templates[this.tpl]) {
      cls = templates[this.tpl];
    }
    return new cls();
  }
  /**
   * register template
   * @type {}
   */
  registerTpl(type, tplClass) {
    templates[type] = tplClass;
  }
  /**
   * run
   * @return {[type]} []
   */
  run() {

  }
}
