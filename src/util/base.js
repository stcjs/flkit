
import util from 'util';

import Message from './message.js';
import PHPTemplate from '../template/php.js';
import Err from './error.js';

const isArray = Array.isArray;

let templates = {
  php: PHPTemplate
};

export default class {
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
  }){
    this.text = this.clean(text);
    this._text = this.text.toLowerCase(); //text lowercase
    this.length = this.text.length;
    this.options = options;

    this.initTpl();
    this.hasTpl = this.hasTpl();
  }
  /**
   * remove unnecessary chars in text
   * @param  {String} text [source text]
   * @return {String}      [cleaned text]
   */
  clean(text){
    //\uFEFF is BOM char
    return text.replace(/\r\n?|[\n\u2028\u2029]/g, '\n').replace(/\uFEFF/g, '');
  }
  /**
   * init tpl
   * @return {} []
   */
  initTpl(){
    this.tpl = (this.options.tpl || '').toLowerCase();
    if(!this.tpl || !this.options.ld){
      this.ld = [];
      this.rd = [];
      return;
    }
    if(!isArray(this.ld)){
      this.ld = [this.ld];
      this.rd = [this.rd];
    }
    this.ld = this.ld.filter(item => {
      return item;
    });
    this.rd = this.rd.filter(item => {
      return item;
    });
    if(this.ld.length !== this.rd.length){
      throw new Error(Message.DelimiterNotEqual);
    }
  }
  /**
   * check text has tpl
   * @return {Boolean}      []
   */
  hasTpl(){
    if (!this.tpl || !this.ld.length) {
      return false;
    }
    let tplInstance = this.getTplInstance();
    for(var i = 0, length = this.ld.length, ld, rd; i < length; i++){
      ld = this.ld[i];
      rd = this.rd[i];
      if (tplInstance.hasTpl(ld, rd, this.text)) {
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
  error(message, line, col, data){
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
   * @param  {string} type: string        []
   * @return {}       []
   */
  getTplInstance(type){
    if(!this.tpl){
      throw new Error(Message.TplEmpty);
    }
    if(!(type in templates)){
      throw new Error(Message.TplNotFound);
    }
    let Class = templates[type];
    return new Class();
  }
  /**
   * register template
   * @type {}
   */
  registerTpl(type, tplClass){
    templates[type] = tplClass;
  }
  /**
   * run
   * @return {[type]} []
   */
  run(){

  }
}