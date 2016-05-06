import BaseTokenize from '../../util/tokenize.js';
import TokenType from '../../util/token_type.js';
import {comments} from '../../util/config.js';
import SelectorTokenize from './selector_tokenize.js';
import Message from '../../util/message.js';
import {isHackChar} from './util.js';
import {atType} from './config.js';

const multiComment = comments[1];

/**
 * css tokenize
 */
export default class extends BaseTokenize {
  /**
   * constructor
   */
  constructor(text, options){
    super(text, options);
    this.prevToken = {};
    this.status = 0;
    this.skipCd();
  }
  /**
   * get next token
   * @return {void} []
   */
  getNextToken(){
    this.skipWhiteSpace();
    this.skipComment();
    this.startToken();
    if (this.pos >= this.length) {
      return this.getLastToken();
    }
    let type = this.prevToken.type;
    if (type !== TokenType.CSS_PROPERTY) {
      let token = this.getTplToken();
      if (token) {
        return token;
      }
    }
    if (this.lookAt(multiComment[0] + '!')) {
      let value = this.getMatched(multiComment[0] + '!', multiComment[1]);
      return this.getToken(TokenType.RESERVED_COMMENT, value);
    }
    let code = this._text.charCodeAt(this.pos);
    switch(code){
      case 0x40: //@
        return this.getAtToken();
      case 0x7b: //{
        if (type === TokenType.CSS_SELECTOR) {
          this.status = 1;
        }
        return this.getToken(TokenType.CSS_LEFT_BRACE, this.next());
      case 0x7d: //}
        this.status = 0;
        return this.getToken(TokenType.CSS_RIGHT_BRACE, this.next());
      case 0x3a: //:
        if (type === TokenType.CSS_PROPERTY) {
          return this.getToken(TokenType.CSS_COLON, this.next());
        }
        break;
      case 0x3b: //;
        return this.getToken(TokenType.CSS_SEMICOLON, this.next());
      case 0x5b: //[
        if (type === TokenType.CSS_SELECTOR || type === TokenType.CSS_VALUE) {
          // for hack [;color: red;]
          let ret = this.getMatched('[', ']');
          if (ret) {
            return this.getToken(TokenType.CSS_BRACK_HACK, ret);
          }
        }
    }
    if (type === TokenType.CSS_PROPERTY) {
      return this.getValueToken();
    }else if (this.status === 1) {
      return this.getPropertyToken();
    }else{
      return this.getSelectorToken();
    }
  }
  /**
   * get selector or name token
   * @return {Object} []
   */
  getSelectorToken(){
    let ret = '', code, str, token, chr, record, escape = false;
    while(this.pos < this.length){
      token = this.getTplToken();
      if (token) {
        ret += token.value;
        continue;
      }
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x5c || escape) {
        escape = !escape;
        ret += this.next();
        continue;
      }else if (code === 0x7b) { // {
        break;
      }else if (code === 0x2f && this.text.charCodeAt(this.pos + 1) === 0x2a) {
        record = record || this.record();
        this.getCommentToken(1, false);
        continue;
      }
      if (record && !this.isWhiteSpace(code)) {
        record = undefined;
      }
      if (!escape && (code === 0x22 || code === 0x27)) {
        ret += this.getQuote({
          rollback: true
        }).value;
        continue;
      }else if (code === 0x5b) { // [ ]
        str = this.getMatchedChar(0x5b, 0x5d, {
          quote: true
        });
        if (str) {
          ret += str;
          continue;
        }
      }else if (code === 0x28) { // ( )
        str = this.getMatchedChar(0x28, 0x29, {
          quote: true,
          nest: true
        });
        if (str) {
          ret += str;
          continue;
        }
      }
      ret += this.next();
    }
    token = this.getToken(TokenType.CSS_SELECTOR, ret);
    token.value = this.skipRightSpace(ret);
    if (record) {
      //record.spaceBefore = record.newlineBefore = 0;
      this.rollback(record);
    }
    if (this.options.parse_selector) {
      token.detail = SelectorTokenize(token.value).run();
    }
    return token;
  }
  /**
   * get property token
   * @return {Object} []
   */
  getPropertyToken(){
    let ret = '', chr, code;
    this.record();
    while(this.pos < this.length){
      chr = this._text[this.pos];
      code = chr.charCodeAt(0);
      // ;
      if (code === 0x3b) {
        this.rollback();
        return this.getValueToken();
      }
      //: / }
      if(code === 0x3a || code === 0x2f || code === 0x7d || this.isWhiteSpace(code)){
        break;
      }
      ret += this.next();
    }
    return this.getToken(TokenType.CSS_PROPERTY, ret, this.parseProperty(ret));
  }
  /**
   * parse property
   * @return {Object} []
   */
  parseProperty(property){
    let prefix = '', suffix = '', code = property.charCodeAt(0);
    if (code === 0x2d) {
      property = property.replace(/^\-\w+\-/, function(a){
        prefix = a;
        return '';
      });
    }else if (isHackChar(code)) {
      prefix = property[0];
      property = property.slice(1);
    }
    return {
      prefix: prefix.toLowerCase(),
      suffix: suffix,
      value: property.toLowerCase()
    };
  }
  /**
   * get value token
   * @return {Object} []
   */
  getValueToken(){
    let ret = '', code, chr, token;
    let escape = false, record, quote, hasTpl = false;
    while(this.pos < this.length){
      token = this.getTplToken();
      if (token) {
        ret += token.value;
        hasTpl = true;
        continue;
      }
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x5c || escape) {
        escape = !escape;
        ret += this.next();
        continue;
      }else if (code === 0x3b || code === 0x7d) { // ; or }
        break;
      }else if (code === 0x2f && this.text.charCodeAt(this.pos + 1) === 0x2a) {
        record = record || this.record();
        this.getCommentToken(1, false);
        continue;
      }
      if (record && !this.isWhiteSpace(code)) {
        record = undefined;
      }
      if (!escape && (code === 0x22 || code === 0x27)) {
        quote = this.getQuote({
          rollback: true
        });
        ret += quote.value;
        if (!quote.find) {
          ret += this.forwardChar(';', false);
          return this.getToken(TokenType.ILLEGAL, ret, {
            message: Message.UnMatchedQuoteChar
          });
        }
        continue;
      }else if (code === 0x28) { // ( )
        ret += this.getMatchedChar(0x28, 0x29, {
          nest: true,
          quote: true,
          multi_comment: true
        });
        continue;
      }
      ret += this.next();
    }
    token = this.getToken(TokenType.CSS_VALUE, ret);
    ret = this.skipRightSpace(ret);
    token.value = ret;
    if (record) {
      //record.spaceBefore = record.newlineBefore = 0;
      this.rollback(record);
    }
    token.ext = this.parseValue(ret);
    token.ext.hasTpl = hasTpl;
    //parse css value
    // if (this.options.parse_value && !hasTpl) {
    //   //token.detail = parseValue(this.prevToken._value, ret);
    // }
    return token;
  }
  /**
   * parse css value
   * @param  {String} value []
   * @return {Object}       []
   */
  parseValue(value){
    //get css value suffix & important
    let prefix = '', suffix = '', important = false;
    if (value.indexOf('\\') > -1) {
      value = value.replace(/(?:\\\d)+$/, function(a){
        suffix = a;
        return '';
      });
    }
    if (value.indexOf('!') > -1) {
      value = value.replace(/!\s*important/i, function(){
        important = true;
        return '';
      });
    }
    // get css value prefix
    if (value.charCodeAt(0) === 0x2d) {
      value = value.replace(/^\-\w+\-/, function(a){
        prefix = a;
        return '';
      });
    }
    if (suffix || important) {
      value = value.trim();
    }
    return {
      prefix: prefix,
      suffix: suffix,
      important: important,
      value: value
    };
  }
  /**
   * skip comment
   * @return {void} []
   */
  skipComment(){
    //start with /*, but not /*!
    let comment;
    while(this.text.charCodeAt(this.pos) === 0x2f && 
      this.text.charCodeAt(this.pos + 1) === 0x2a &&
      this.text.charCodeAt(this.pos + 2) !== 0x21){

      comment = this.getCommentToken(1, true);
      this.commentBefore.push(comment);
    }
  }
  /**
   * get @ token
   * @return {Object} []
   */
  getAtToken(){
    let i = 0, item, code, ret = '', length, chr, type = TokenType.CSS_AT;
    for(; item = atType[i++]; ){
      if (!this.lookAt(item[0])) {
        continue;
      }
      length = item[0].length;
      code = this._text.charCodeAt(this.pos + length);
      // whitespace or ; or { or / or ' or " or : or , 
      if (code === 0x20 || code === 0x3b || code === 0x7b || 
          code === 0x2f || code === 0x22 || code === 0x27 || 
          code === 0x3a || code === 0x2c) {
        ret = this.forward(length);
        type = item[1];
        break;
      }
    }
    while(this.pos < this.length){
      chr = this.text[this.pos];
      code = chr.charCodeAt(0);
      if (code === 0x2f && this.text.charCodeAt(this.pos + 1) === 0x2a) {
        ret += this.getCommentToken(1).value;
        continue;
      }else if (code === 0x22 || code === 0x27) {
        ret += this.getQuote().value;
        continue;
      }
      // ; 
      if (code === 0x3b) {
        ret += this.next();
        break;
      }
      // {
      if (code === 0x7b) {
        break;
      }
      ret += this.next();
    }
    let token = this.getToken(type, ret);
    token.value = this.skipRightSpace(ret);
    return token;
  }
  /**
   * run
   * @return {Array} [text tokens]
   */
  run(){
    let ret = [], token, type;
    for(; token = this.getNextToken(); ){
      ret.push(token);
      type = token.type;
      if (type === TokenType.TPL || type === TokenType.CSS_LEFT_BRACE ||
          type === TokenType.CSS_RIGHT_BRACE || type === TokenType.CSS_COLON ||
          type === TokenType.CSS_SEMICOLON || type === TokenType.CSS_BRACK_HACK ||
          type === TokenType.RESERVED_COMMENT
        ){
        continue;
      }
      this.prevToken = token;
      if (type === TokenType.CSS_FONT_FACE || 
          type === TokenType.CSS_PAGE ||
          type === TokenType.CSS_VIEWPORT ||
          type === TokenType.CSS_AT) {
        this.status = 1;
      }
    }
    return ret;
  }
}