import Base from '../../util/base.js';
import Tokenize from './tokenize.js';

import TokenType from '../../util/token_type.js';
import SelectorTokenize from './selector_tokenize.js';

import {
  getShortValue,
  isMultiSameProperty,
  mergeProperties,
  selectorToken2Text,
  isAtType
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

    this.selectors = {};
    this.inKeyframes = false;
    this.tagMultis = {};

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
   * compress css value
   */
  compressValue(value, property){
    // remove comment
    value = value.replace(/\/\*.*?\*\//g, '');
    // remove newline
    value = value.replace(/\n+/g, '');
    // remove extra whitespace
    value = value.replace(/\s+/g, ' ');
    // if property is filter, can't replace `, ` to `,`
    // see http://www.imququ.com/post/the_bug_of_ie-matrix-filter.html
    if(property.toLowerCase() !== 'filter'){
      // remove whitespace after ,
      value = value.replace(/,\s+/g, ',');
    }
    // get short value
    if(this.options.shortValue){
      value = getShortValue(value, property);
    }
    // replace 0(px,em,%) with 0.
    value = value.replace(/(^|\s)(0)(?:px|em|%|in|cm|mm|pc|pt|ex|rem)/gi, '$1$2');
    // replace 0.6 to .6
    value = value.replace(/(?:^|\s)0\.(\d+)/g, '.$1');
    // Shorten colors from #AABBCC to #ABC. Note that we want to make sure
		// the color is not preceded by either ", " or =. Indeed, the property
		//     filter: chroma(color="#FFFFFF");
		// would become
		//     filter: chroma(color="#FFF");
		// which makes the filter break in IE.
    value = value.replace(/([^\"'=\s])(\s*)#([0-9a-fA-F])\3([0-9a-fA-F])\4([0-9a-fA-F])\5/ig, '$1$2#$3$4$5');
    return value;
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
            valueToken.ext.value = this.compressValue(valueToken.ext.value, propertyToken.ext.value);
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
    if(!token.ext.group){
      let instance = new SelectorTokenize(token.value, this.options);
      token.ext = instance.run();
    }
    let detail = {
      attrs,
      selector: token,
      pos: selectorPos++
    };
    let selectorKey = selectorToken2Text(token);
    if(selectorKey in this.selectors){
      this.selectors[selectorKey] = mergeProperties(this.selectors[selectorKey], attrs);
    }else{
      this.selectors[selectorKey] = detail;
    }
  }
  /**
   * compress selector
   */
  compressSelector(){

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
        case TokenType.CSS_RIGHT_BRACE:
        
        case TokenType.CSS_KEYFRAMES:
          this.options.sortSelector = false;
          this.options.sortProperty = false;
          this.inKeyframes = true;
        default:
          if(isAtType(token.type)){
            this.compressSelector();
          }
          if(token.type === TokenType.CSS_CHARSET){
            if(!hasCharset){
              this.result.push(token);
            }
            hasCharset = true;
          }else{
            this.result.push(token);
          }
      }
    }
    this.compressSelector();

    return this._optText;
  }
}