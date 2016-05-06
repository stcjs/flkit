import Base from './base.js';
import {isWhiteSpace} from './util.js';
import {cdo, comments} from './config.js';
import Err from './error.js';
import Message from './message.js';
import TokenType from './token_type.js';

const lineComments = comments[0];

export default class extends Base {
  /**
   * constructor
   * @param  {String} text    []
   * @param  {Object} options []
   * @return {void}         []
   */
  constructor(text, options) {
    super(text, options);
    this.pos = 0;
    this._pos = 0;
    this.line = 0;
    this._line = 0;
    this.col = 0;
    this._col = 0;
    this.newlineBefore = 0;
    this._newlineBefore = 0;
    this.spaceBefore = 0;
    this._spaceBefore = 0;
    this.commentBefore = [];
  }
  /**
   * get next char
   * @return {Function} [next char from text]
   */
  next(){
    let chr = this.text[this.pos++];
    //0x0a is \n
    if (chr.charCodeAt(0) === 0x0a) {
      this.line++;
      this.col = 0;
      this.newlineBefore++;
    }else{
      this.col++;
    }
    return chr;
  }
  /**
   * forward num chars
   * @param  {Number} i []
   * @return {String}   [forward string]
   */
  forward(i){
    let ret = '';
    while (i-- > 0){
      ret += this.next();
    }
    return ret;
  }
  /**
   * forward to char
   * @param  {String} chr []
   * @return {String}     []
   */
  forwardChar(chr, contain){
    let pos = this._text.indexOf(chr, this.pos);
    if (pos === -1) {
      return '';
    }
    let str = this.forward(pos - this.pos + (contain !== false ? 1 : 0));
    return str;
  }
  /**
   * skip whitespace
   * @return {void} []
   */
  skipWhiteSpace(){
    //let whitespace = this.whitespace;
    while(this.isWhiteSpace(this.text.charCodeAt(this.pos))){
      this.spaceBefore++;
      this.next();
    }
  }
  /**
   * check char is whitespace
   */
  isWhiteSpace(chr){
    return isWhiteSpace(chr);
  }
  /**
   * skip comment
   * sub class override
   * @return {void} []
   */
  skipComment(){

  }
  /**
   * skip right space for text
   * @param  {String} value []
   * @return {String}       []
   */
  skipRightSpace(value){
    let length = value.length, index = length - 1;
    let newlines = 0, spaces = 0, chr, code;
    while(index >= 0){
      chr = value[index];
      code = chr.charCodeAt(0);
      if (this.isWhiteSpace(code)) {
        index--;
        spaces++;
        if (code === 0x0a) {
          newlines++;
        }
        continue;
      }
      break;
    }
    this.newlineBefore += newlines;
    this.spaceBefore += spaces;
    return value.slice(0, index + 1);
  }
  /**
   * skip cdo and cdc string
   * @return {void} []
   */
  skipCd(){
    if (this.lookAt(cdo)) {
      this.forward(4);
      this.length -= 3;
    }
  }
  /**
   * look at string in current position
   * @param  {String} str           []
   * @return {Boolean}              []
   */
  lookAt(str){
    return str === this._text.substr(this.pos, str.length);
  }
  /**
   * find string, support escape
   * @param  {String} str [find string in text]
   * @return {Number}     [string pos in text]
   */
  find(str, forward = 0){
    return this._text.indexOf(str, this.pos + forward);
  }
  /**
   * throw error
   * @param  {String} message []
   * @param  {Number} line    []
   * @param  {Number} col     []
   * @return {void}         []
   */
  error(message, useRecord){
    if (useRecord) {
      throw new Err(message, this._record.line, this._record.col);
    }else{
      throw new Err(message, this.line, this.col);
    }
  }
  /**
   * record line & col & pos
   * @return {void} []
   */
  record(){
    this._record = {
      line: this.line,
      col: this.col,
      pos: this.pos,
      newlineBefore: this.newlineBefore,
      spaceBefore: this.spaceBefore
    };
    return this._record;
  }
  /**
   * rollback parse
   * @return {void} []
   */
  rollback(record){
    record = record || this._record;
    if (!record) {
      return false;
    }
    this.line = record.line;
    this.col = record.col;
    this.pos = record.pos;
    this.newlineBefore = record.newlineBefore;
    this.spaceBefore = record.spaceBefore;
  }
  /**
   * get quote text, support template syntax in quote
   * @return {String} [quote string]
   */
  getQuote(options = {}){
    let quote = this.next(), quoteCode = quote.charCodeAt(0);
    let ret = quote, find = false, tpl, code, chr;
    let supportEscape = options.escape, escape = false;
    this.record();
    /*jshint -W084 */
    while(this.pos < this.length){
      //template syntax in quote string
      tpl = this.getTplToken();
      if (tpl) {
        ret += tpl.value;
        continue;
      }
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (supportEscape && (code === 0x5c || escape)) {
        escape = !escape;
        ret += this.next();
        continue;
      }
      // chr is quote, but next chr is not
      if (!escape && code === quoteCode) {
        if (!options.checkNext || this.text.charCodeAt(this.pos + 1) !== code) {
          find = true;
          ret += this.next();
          break;
        }
      }
      ret += this.next();
    }
    if (!find) {
      if (options.throwError) {
        this.error(Message.UnMatchedQuoteChar, true);
      }else if (options.rollback) {
        this.rollback();
        return {
          value: quote,
          find: false
        };
      }
    }
    return {
      value: ret,
      find: find
    };
  }
  /**
   * get matched string
   * not supoort tpl, nested, quote
   * @param  {String} start []
   * @param  {String} end   []
   * @return {String}       []
   */
  getMatched(start, end){
    if (!this.lookAt(start)) {
      return false;
    }
    let startLength = start.length, endLength = end.length;
    let pos = this.find(end, startLength);
    //can't find end string in text
    if (pos === -1) {
      return false;
    }
    return this.forward(pos - this.pos + endLength);
  }
  /**
   * get match char, such as: [], (), {}
   * @param  {Number} startCode [start char]
   * @param  {Number} endCode   [end char]
   * @return {String}           [matched char]
   */
  getMatchedChar(startCode, endCode, options){
    if (this._text.charCodeAt(this.pos) !== startCode) {
      return false;
    }
    options = options || {};
    let code, nextCode, comment, nums = 0;
    let ret = this.next(), chr;
    let quote = options.quote;
    let multi_comment = options.multi_comment;
    let line_comment = options.line_comment;
    let nest = options.nest;
    let supportEscape = options.escape, escape = false;
    /*jshint -W084 */
    while(this.pos < this.length){
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (supportEscape && (code === 0x5c || escape)) {
        escape = !escape;
        ret += this.next();
        continue;
      }
      if (quote && !escape && (code === 0x22 || code === 0x27)) {
        ret += this.getQuote({
          rollback: true
        }).value;
        continue;
      }
      if (code === 0x2f) {
        nextCode = this.text.charCodeAt(this.pos + 1);
        comment = '';
        if (multi_comment && nextCode === 0x2a) {
          comment = this.getCommentToken(1, false);
        }else if (line_comment && nextCode === 0x2f) {
          comment = this.getCommentToken(0, false);
        }
        if (comment) {
          ret += comment.value;
          continue;
        }
      }
      if (nest && code === startCode) {
        nums++;
      }else if (code === endCode) {
        if (!nest || nums === 0) {
          ret += this.next();
          return ret;
        }
        nums--;
      }
      ret += this.next();
    }
    return ret;
  }
  /**
   * start token
   * @return {void} []
   */
  startToken(){
    this._line = this.line;
    this._col = this.col;
    this._pos = this.pos;
    this._newlineBefore = this.newlineBefore;
    this._spaceBefore = this.spaceBefore;
  }
  /**
   * get template token
   * @return {Object} []
   */
  getTplToken(){
    if (!this.hasTpl) {
      return false;
    }
    let length = this.ld.length, ld, rd, tplInstance = this.getTplInstance();
    let ret, _value;
    for(let i = 0; i < length; i++){
      ld = this.ld[i];
      rd = this.rd[i];
      ret = tplInstance.getMatched(ld, rd, this);
      if (ret) {
        if (ret.slice(0 - rd.length) === rd) {
          _value = ret.slice(ld.length, 0 - rd.length);
        }else{
          _value = ret.slice(ld.length);
        }
        return this.getToken(TokenType.TPL, ret, {
          ld: ld,
          rd: rd,
          _value: _value
        });
      }
    }
    return false;
  }
  /**
   * check next chars is template syntax
   * @return {Boolean} []
   */
  isTplNext(){
    if (!this.hasTpl) {
      return false;
    }
    let length = this.ld.length;
    for(let i = 0; i < length; i++){
      if (this.lookAt(this.ld[i])) {
        return true;
      }
    }
    return false;
  }
  /**
   * get next token
   * @return {Object} []
   */
  getNextToken(){
    this.skipWhiteSpace();
    this.skipComment();
    this.startToken();
    let token = this.getTplToken();
    if (token !== false) {
      return token;
    }
    if (this.pos >= this.length) {
      return this.getLastToken();
    }
  }
  /**
   * get token info
   * @param  {String} type  []
   * @param  {String} value []
   * @return {Object}       []
   */
  getToken(type, value, extra){
    let data = {
      type: type,
      value: value || '',
      start: this._pos,
      end: this.pos,
      loc: {
        start: {
          line: this._line,
          column: this._col
        },
        end: {
          line: this.line,
          column: this.col
        }
      },
      newlineBefore: this._newlineBefore,
      spaceBefore: this._spaceBefore,
      commentBefore: this.commentBefore,
      ext: {}
    };
    if (extra) {
      for(let key in extra){
        data.ext[key] = extra[key];
      }
    }
    this.newlineBefore = this.spaceBefore = 0;
    this.commentBefore = [];
    return data;
  }
  /**
   * get last token
   * @return {Object} []
   */
  getLastToken(){
    if (this.newlineBefore || this.spaceBefore || this.commentBefore.length) {
      return this.getToken(TokenType.EOS);
    }
    return false;
  }
  /**
   * get comment string
   * @param  {String} type           []
   * @return {Object}                []
   */
  getCommentToken(type, skipWhiteSpace, inText){
    this.record();
    let result;
    if (type === 0) {
      result = this.getLineComment();
    }else{
      let value = comments[type];
      result = this.getMatched(value[0], value[1]);
    }
    if (!result) {
      return false;
    }
    let data = {
      value: result,
      start: this._record.pos,
      end: this.pos,
      loc: {
        start: {
          line: this._record.line,
          column: this._record.col
        },
        end: {
          line: this.line,
          column: this.col
        }
      },
      newlineBefore: this._record.newlineBefore,
      spaceBefore: this._record.spaceBefore
    };
    if (inText) {
      data.newlineBefore = data.spaceBefore = 0;
    }
    this.newlineBefore = this.spaceBefore = 0;
    if (skipWhiteSpace !== false) {
      this.skipWhiteSpace();
    }
    return data;
  }
  /**
   * get line comment
   * @return {Object} []
   */
  getLineComment(){
    if (!this.lookAt(lineComments[0])) {
      return;
    }
    let ret = this.forward(lineComments[0].length);
    let chr, code;
    while(this.pos < this.length){
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x0a) {
        break;
      }
      ret += this.next();
    }
    return ret;
  }
  /**
   * run
   * @return {Array} [text tokens]
   */
  run(){
    let ret = [], token;
    while(token = this.getNextToken()){
      ret.push(token);
    }
    return ret;
  }
}