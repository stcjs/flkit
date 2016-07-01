import Base from '../../util/base.js';
import Tokenize from './tokenize.js';

import TokenType from '../../util/token_type.js';

import {
  getShortValue,
  isMultiSameProperty,
  mergeProperties
} from './util.js';

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

    let attrs = {}, pos = 0, key = '', hasColon = false;
    let propertyToken = null, valueToken = null, tplToken = null;

    selectorCondition: while(this.index < this.length){
      let token = this.tokens[this.index++];
      switch(token.type){
        case TokenType.CSS_PROPERTY:
          key += this.options.propertyToLower ? token.value.toLowerCase() : token.value;
          if(!this.options.overrideSameProperty && (key in attrs)){
            key += pos++;
          }
          propertyToken = token;

          // has tplToken before property
          if(tplToken){
            attrs[`${tplToken.value}%${pos++}`] = {
              value: tplToken
            }
            tplToken = null;
          }
          break;
        case TokenType.CSS_VALUE:
          valueToken = token;
          break;
        case TokenType.CSS_SEMICOLON:
        case TokenType.CSS_RIGHT_BRACE:
          if(valueToken === null && tplToken){
            valueToken = tplToken;
            tplToken = null;
          }
          // already has tplToken
          if(tplToken){
            attrs[`${tplToken.value}%${pos++}`] = {
              value: tplToken
            }
            tplToken = null;
          }

          if(!propertyToken || !valueToken){
            break;
          }
          
          // propertyToken is tpl
          if(propertyToken.type === TokenType.TPL){
            attrs[`${propertyToken.value}%${pos++}`] = {
              property: propertyToken,
              value: valueToken
            }
            propertyToken = valueToken = null;
            break;
          }

          // optimize css value
          if(valueToken.type === TokenType.CSS_VALUE){
            // if property is filter, can't replace `, ` to `,`
					  // see http://www.imququ.com/post/the_bug_of_ie-matrix-filter.html
            if(propertyToken.ext.value.toLowerCase() !== 'filter'){
              // remove whitespace after ,
              valueToken.ext.value = valueToken.ext.value.replace(/,\s+/g, ',');
            }
            // get short value
            if(this.options.shortValue){
              valueToken.ext.value = getShortValue(valueToken.ext.value, propertyToken.ext.value);
            }

            /**
             * for div{color:red;color:blue\9;}
             * if suffix in css value, can not override property.
             */
            key += valueToken.ext.suffix;
          }


          //multi same property
          //background:red;background:url(xx.png)
          if(isMultiSameProperty(key, valueToken.value)){
            key += '%' + pos++;
          }
          
          if(this.options.overrideSameProperty){
            attrs = mergeProperties(attrs, {
              [key]: {
                property: propertyToken,
                value: valueToken
              }
            });
          }else{
            attrs[key] = {
              property: propertyToken,
              value: valueToken
            }
          }
          propertyToken = valueToken = null;
          hasColon = false;
          key = '';
          break;
        case TokenType.CSS_BRACK_HACK:
          // for css hack [;color:red;]
          attrs[`${token.value}%${pos++}`] = {
            value: token
          };
          break;
        case TokenType.TPL:
          // already has tplToken
          if(tplToken){
            attrs[`${token.value}%${pos++}`] = {
              value: tplToken
            }
          }
          tplToken = token;
          break;
        case TokenType.CSS_COLON:
          // is tplToken before :
          if(!propertyToken && tplToken){
            propertyToken = tplToken;
            tplToken = null;
          }
          hasColon = true;
          break;
        case TokenType.CSS_RIGHT_BRACE:
          break selectorCondition;
      }
    }
    return attrs;
  }
  /**
   * collect selector
   */
  collectSelector(token, selectorPos = 0){
    let attrs = this.getSelectorProperties();
    // remove empty selector
    if(this.options.removeEmptySelector && Object.keys(attrs).length === 0){
      return true;
    }
    
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