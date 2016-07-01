import Base from '../../util/base.js';
import Tokenize from './tokenize.js';

import TokenType from '../../util/token_type.js';

/**
 * default compress options
 */
const compressOpts = {
  removeLastSemicolon: true, 
  removeEmptySelector: true, 
  overrideSameProperty: true, 
  shortValue: true, 
  mergeProperty: true, 
  sortProperty: true, 
  sortSelector: true, 
  mergeSelector: true, 
  propertyToLower: true 
}
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
    this.result = [];
    this.index = 0;
    this.length = 0;

    this.selectors = [];


    this.options = {
      ...compressOpts,
      ...this.options
    }
  }
  /**
   * init tokens
   */
  initTokens(){
    if(typeof this._optText === 'string'){
      let instance = new Tokenize(this._optText, this.options);
      this.tokens = instance.run();
    }else{
      this.tokens = this._optText;
    }
    this.length = this.tokens.length;
  }
  /**
   * get selector properties
   */
  getSelectorProperties(){
    let braces = this.tokens[this.index++];
    if(braces.type !== TokenType.CSS_LEFT_BRACE){
      throw new Error('after selector must be a {');
    }
    let attrs = {}, pos = 0;
    let attr = '', value = '';
    let hack = false, hasColon = false, hasTpl = false, tpl = false;
    selectorCondition: while(this.index < this.length){
      let token = this.tokens[this.index++];
      switch(token.type){
        case TokenType.CSS_PROPERTY:
          attr += this.options.propertyToLower ? token.value.toLowerCase() : token.value;
          if(!this.options.overrideSameProperty && attr in attrs){
            attr += pos++;
          }
          break;
        case TokenType.CSS_VALUE:
          value = token.value;
          break;
        case TokenType.CSS_SEMICOLON:
        case TokenType.CSS_RIGHT_BRACE:
          if(value === ''){
            if(attr && this.hasTpl(attr)){
              attrs[`${attr}%${pos++}`] = {
                type: TokenType.TPL,
                value: attr
              }
            }
            attr = value = '';
            hasColon = tpl = false;
            if(token.type === CSS_SEMICOLON){
              continue;
            }else{
              break selectorCondition;
            }
          }
          if(tpl || this.hasTpl(attr)){
            hasTpl = true;
            attrs[`${attr}%${pos++}`] = {
              property: attr,
              value
            }
          }else{
            console.log(token);
          }
      }
    }
  }
  /**
   * collect selector
   */
  collectSelector(token, selectorPos){
    let attrs = this.getSelectorProperties();
  }
  /**
   * run
   */
  run(){
    this.initTokens();
    let hasCharset = false;
    let sortSelector = this.options.sortSelector;
    let sortProperty = this.options.sortProperty;
    let selectorPos = 0;
    while (this.index < this.length) {
      let token = this.tokens[this.index++];
      switch(token.type){
        case TokenType.CSS_SELECTOR:
          this.collectSelector(token, selectorPos++);
          break;
      }
    }

    return this._optText;
  }
}