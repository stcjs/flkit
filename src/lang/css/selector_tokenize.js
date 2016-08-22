import Base from '../../util/tokenize.js';
import TokenType from '../../util/token_type.js';
import {selectorBreakChar, isPseudoElement, calculateSelectorSpecificity} from './util.js';
import {namespaceReg} from './config.js';

/**
 * css selector tokenize
 * https://www.w3.org/TR/css3-selectors/#lex
 */
export default class CssSelectorTokenize extends Base {
  /**
   * constructor
   */
  constructor(text, options){
    super(text, options);
    this.prevToken = null;
  }
   /**
   * get next token
   * @return {Object} []
   */
  getNextToken(){
    let token = super.getNextToken();
    if (token || token === false) {
      return token;
    }
    if (!this.prevToken || this.prevToken.type === TokenType.CSS_SELECTOR_COMMA) {
      let match = this.text.match(namespaceReg);
      if (match) {
        this.forward(match[0].length);
        return this.getToken(TokenType.CSS_SELECTOR_NAMESPACE, match[0]);
      }
    }
    let code = this.text.charCodeAt(this.pos);
    switch(code){
      case 0x2a: // *
        return this.getToken(TokenType.CSS_SELECTOR_UNIVERSAL, this.next());
      case 0x2c: // ,
        return this.getToken(TokenType.CSS_SELECTOR_COMMA, this.next());
      case 0x3e: // >
      case 0x2b: // +
      case 0x7e: // ~
        return this.getToken(TokenType.CSS_SELECTOR_COMBINATOR, this.next());
      case 0x23: // #
        return this.getCommonToken(TokenType.CSS_SELECTOR_ID);
      case 0x2e: // .
        return this.getCommonToken(TokenType.CSS_SELECTOR_CLASS);
      case 0x5b: // [
        return this.getAttributeToken();
      case 0x3a: // :
        if (this.text.charCodeAt(this.pos + 1) === 0x3a) {
          this.next();
          token = this.getCommonToken(TokenType.CSS_SELECTOR_PSEUDO_ELEMENT);
          token.value = ':' + token.value;
          token.vender = token.value.charCodeAt(2) === 0x2d;
          return token;
        }
        return this.getPseudoClassToken();
      default:
        return this.getCommonToken(TokenType.CSS_SELECTOR_TYPE);
    }
    //return false;
  }
  /**
   * skip comment
   * @return {void} []
   */
  skipComment(){
    //start with /*
    let comment;
    while(this.text.charCodeAt(this.pos) === 0x2f && 
      this.text.charCodeAt(this.pos + 1) === 0x2a){

      comment = this.getCommentToken(1, true);
      this.commentBefore.push(comment);
    }
  }
  /**
   * get common token
   * @param  {Number} type []
   * @return {Object}      []
   */
  getCommonToken(type){
    let ret = this.next(), code;
    while(this.pos < this.length){
      code = this.text.charCodeAt(this.pos);
      if (selectorBreakChar(code) || this.isWhiteSpace(code)) {
        break;
      }
      ret += this.next();
    }
    return this.getToken(type, ret);
  }
  /**
   * get attribute token
   * @return {Object} []
   */
  getAttributeToken(){
    let ret = this.getMatchedChar(0x5b, 0x5d, {
      quote: true
    });
    return this.getToken(TokenType.CSS_SELECTOR_ATTRIBUTE, ret);
  }
  /**
   * get pseudo class token, support :not(xxx)
   * @return {Object} []
   */
  getPseudoClassToken(){
    let ret = this.next(), code;
    while(this.pos < this.length){
      code = this.text.charCodeAt(this.pos);
      if (code === 0x28) {
        ret += this.getMatchedChar(0x28, 0x29, {
          nest: true,
          quote: true
        });
        continue;
      }
      if (selectorBreakChar(code) || this.isWhiteSpace(code)) {
        break;
      }
      ret += this.next();
    }
    if (isPseudoElement(ret)) {
      return this.getToken(TokenType.CSS_SELECTOR_PSEUDO_ELEMENT, ret);
    }
    let token = this.getToken(TokenType.CSS_SELECTOR_PSEUDO_CLASS, ret);
    token.vender = token.value.charCodeAt(1) === 0x2d;
    return token;
  }
  /**
   * check token valid
   * @param  {Object} token []
   * @return {Boolean}       []
   */
  checkInvalid(token){
    switch(token.type){
      case TokenType.CSS_SELECTOR_CLASS:
        if (token.value.length === 1) {
          return true;
        }
        break;
    }
  }
  /**
   * run
   * @return {Object} []
   */
  run(){
    let result = [], tokens = [], token, min = -1, max = -1;
    let specificity, invalid = false, vender = false;
    for(; token = this.getNextToken(); ){
      this.prevToken = token;
      if (token.type === TokenType.CSS_SELECTOR_COMMA) {
        specificity = calculateSelectorSpecificity(tokens);
        if (min === -1) {
          min = max = specificity;
        }else{
          if (specificity < min) {
            min = specificity;
          }
          if (specificity > max) {
            max = specificity;
          }
        }
        result.push({
          tokens: tokens,
          specificity: specificity
        });
        tokens = [];
      }else{
        if (!vender) {
          vender = token.vender;
        }
        if (!invalid) {
          invalid = this.checkInvalid(token);
        }
        tokens.push(token);
      }
    }
    if (tokens.length) {
      specificity = calculateSelectorSpecificity(tokens);
      if (min === -1) {
        min = max = specificity;
      }else{
        if (specificity < min) {
          min = specificity;
        }
        if (specificity > max) {
          max = specificity;
        }
      }
      result.push({
        tokens: tokens,
        specificity: specificity
      });
    }
    let data = {
      minSpecificity: min,
      maxSpecificity: max,
      specificityEqual: min === max,
      hasVender: !!vender,
      group: result
    };
    if (invalid) {
      data.invalid = true;
    }
    return data;
  }
}