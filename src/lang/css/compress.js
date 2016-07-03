import Base from '../../util/base.js';
import Tokenize from './tokenize.js';

import TokenType from '../../util/token_type.js';
import SelectorTokenize from './selector_tokenize.js';

import {
  getShortValue,
  isMultiSameProperty,
  mergeProperties,
  selectorToken2Text,
  isAtType,
  isUnMergeProperty,
  token2Text,
  mergePropertyChildren,
  selectorGroupToken2Text
} from './util.js';

import {createToken} from '../../util/util_ext.js';


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
};
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
    this.index = 0;
    this.length = 0;

    this.result = [];
    this.selectors = {};
    this.inKeyframes = false;

    this.options = {
      ...compressOpts,
      ...this.options
    };
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

    // get short value
    if(this.options.shortValue){
      value = getShortValue(value, property);
    }

    // if property is filter, can't replace `, ` to `,`
    // see http://www.imququ.com/post/the_bug_of_ie-matrix-filter.html
    if(property.toLowerCase() !== 'filter'){
      // remove whitespace after ,
      value = value.replace(/,\s+/g, ',');
      value = value.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3');
    }
    
    // replace 0(px,em,%) with 0.
    value = value.replace(/(^|\s)(0)(?:px|em|%|in|cm|mm|pc|pt|ex|rem)/gi, '$1$2');
    // replace 0.6 to .6
    value = value.replace(/(^|\s)0\.(\d+)/g, '$1.$2');
    // replace 1.0 to 1
    value = value.replace(/(\d+)\.0(\s|$)/g, '$1$2');
    // replace .0 to 0
    value = value.replace(/(^|\s)\.(0)(\s|$)/g, '$1$2$3');
    // Shorten colors from #AABBCC to #ABC. Note that we want to make sure
		// the color is not preceded by either ", " or =. Indeed, the property
		//     filter: chroma(color="#FFFFFF");
		// would become
		//     filter: chroma(color="#FFF");
		// which makes the filter break in IE.
    // value = value.replace(/([^\"'=\s])(\s*)#([0-9a-fA-F])\3([0-9a-fA-F])\4([0-9a-fA-F])\5/ig, '$1$2#$3$4$5');
    return value;
  }
  /**
   * get selector properties
   */
  getSelectorProperties(){
    let braces = this.tokens[this.index++];
    if(!braces){
      return {};
    }
    if(braces.type !== TokenType.CSS_LEFT_BRACE){
      throw new Error('after selector must be a {');
    }

    let attrs = {}, pos = 0, key = '';
    let propertyToken = null, valueToken = null, tplToken = null;
    let hasTpl = false, hasHack = false;

    selectorCondition: while(this.index < this.length){
      let token = this.tokens[this.index++];
      switch(token.type){
        case TokenType.CSS_PROPERTY:
          key += this.options.propertyToLower ? token.value.toLowerCase() : token.value;
          if(!this.options.overrideSameProperty && (key in attrs)){
            key += pos++;
          }
          if(this.options.propertyToLower){
            token.ext.value = token.ext.value.toLowerCase();
            token.value = token.value.toLowerCase();
          }
          propertyToken = token;

          // has tplToken before property
          if(tplToken){
            attrs[`${tplToken.value}%${pos++}`] = {
              value: tplToken
            };
            tplToken = null;
          }
          break;
        case TokenType.CSS_VALUE:
          valueToken = token;
          break;
        case TokenType.CSS_SEMICOLON:
        case TokenType.CSS_RIGHT_BRACE:
          if(valueToken === null && tplToken && propertyToken){
            valueToken = tplToken;
            tplToken = null;
          }

          // already has tplToken
          if(tplToken){
            attrs[`${tplToken.value}%${pos++}`] = {
              value: tplToken
            };
            tplToken = null;
          }

          if(!propertyToken || !valueToken){
            if(token.type === TokenType.CSS_RIGHT_BRACE){
              break selectorCondition;
            }
            break;
          }
          
          // propertyToken is tpl
          if(propertyToken.type === TokenType.TPL){
            attrs[`${propertyToken.value}%${pos++}`] = {
              property: propertyToken,
              value: valueToken
            };
            propertyToken = valueToken = null;
            if(token.type === TokenType.CSS_RIGHT_BRACE){
              break selectorCondition;
            }
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

          // already has tpl syntax, can not override property
          // div{<&if $name&>color:red;<&else&>color:blue;<&/if&>font-size:12px;}
          if(hasTpl){
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
            };
          }
          propertyToken = valueToken = null;
          //hasColon = false;
          key = '';

          if(token.type === TokenType.CSS_RIGHT_BRACE){
            break selectorCondition;
          }
          break;
        case TokenType.CSS_BRACK_HACK:
          // for css hack [;color:red;]
          attrs[`${token.value}%${pos++}`] = {
            value: token
          };
          hasHack = true;
          break;
        case TokenType.TPL:
          // already has tplToken
          if(tplToken){
            attrs[`${token.value}%${pos++}`] = {
              value: tplToken
            };
          }
          tplToken = token;
          hasTpl = true;
          break;
        case TokenType.CSS_COLON:
          // is tplToken before :
          if(!propertyToken && tplToken){
            propertyToken = tplToken;
            tplToken = null;
          }
          //hasColon = true;
          break;
      }
    }
    if(!hasHack && !hasTpl){
      if(this.options.sortProperty){
        attrs = this.sortProperties(attrs);
      }
      if(this.options.mergeProperty){
        attrs = this.mergePropertyChildren(attrs);
      }
    }
    return attrs;
  }
  /**
   * sort properties
   */
  sortProperties(attrs){
    return attrs;
  }
  /**
   * merge properties
   */
  mergePropertyChildren(attrs){
    attrs = mergePropertyChildren(attrs, 'padding');
    attrs = mergePropertyChildren(attrs, 'margin');
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
    token.value = selectorKey;
    if(selectorKey in this.selectors){
      this.selectors[selectorKey].attrs = mergeProperties(this.selectors[selectorKey].attrs, attrs);
    }else{
      this.selectors[selectorKey] = detail;
    }
  }
  /**
   * selector can combine
   */
  selectorCanCombine(selectors){
    let list = ['-ms-', ':root', '-placeholder'];
    return selectors.every(selector => {
      return list.every(item => {
        return selector.selector.value.indexOf(item) === -1;
      });
    });
  }
  /**
   * get properties intersect in 2 selectors
   */
  getPropertiesIntersect(se1, se2){
    let attrs1 = se1.attrs;
    let attrs2 = se2.attrs;
    let assoc = {};
    let assoclen = 0;
    for(let key in attrs1){
      // only have value token
      if(!attrs1[key].property){
        continue;
      }
      // not exist in attrs2
      if(!(key in attrs2)){
        continue;
      }
      if(!attrs2[key].property){
        continue;
      }
      let attrs1Value = attrs1[key].value.value;
      let attrs2Value = attrs2[key].value.value;
      // value not equal
      if(attrs1Value !== attrs2Value){
        continue;
      }
      // property has prefix or value has suffix
      // if(attrs1[key].property.ext.prefix || attrs1[key].value.ext.suffix){
      //   continue;
      // }
      if(this.isUnMergeProperty(attrs1[key], attrs1, attrs2)){
        continue;
      }
      assoc[key] = attrs1[key];
      //2 chars is : and ;
      assoclen += attrs1[key].property.value.length + attrs1[key].value.value.length + 2;
    }
    let length = Object.keys(assoc).length;
    if(length === 0){
      return false;
    }
    if(length !== Object.keys(attrs1).length 
      && length !== Object.keys(attrs2).length){
      // 3 chars is `, { }`
      let selen = se1.selector.value.length + se2.selector.value.length + 3;
      if(selen >= assoclen){
        return false;
      }
    }
    return assoc;
  }
  /**
   * check css value token equal
   */
  checkValueTokenEqual(item1, item2){
    let ext1 = item1.ext;
    let ext2 = item2.ext;
    let list = ['prefix', 'suffix', 'value', 'important'];
    return list.every(item => {
      return ext1[item] === ext2[item];
    });
  }
  /**
   * is unmerge property
   */
  isUnMergeProperty(item1, attrs1, attrs2){
    let item1Property = item1.property.ext.value.toLowerCase();
    let item1PropertyPrefix = item1.property.ext.prefix;
    let item1Value = item1.value.ext.value;
    if(isUnMergeProperty(item1Property, item1Value)){
      return true;
    }
    // if(isUnSortProperty(item1Property)){
    //   return true;
    // }
    for(let key in attrs1){
      let itemPropertyValue = attrs1[key].property.ext.value.toLowerCase();
      let itemPropertyPrefix = attrs1[key].property.ext.prefix;
      if(item1Property === itemPropertyValue){
        if(item1PropertyPrefix !== itemPropertyPrefix){
          return true;
        }
        if(!this.checkValueTokenEqual(item1.value, attrs1[key].value)){
          return true;
        }
      }
      if(item1Property.indexOf('-') > -1){
        if(item1Property.indexOf(itemPropertyValue + '-') > -1){
          return true;
        }
      }else{
        if(itemPropertyValue.indexOf(item1Property + '-') > -1){
          return true;
        }
      }
    }
    for(let key in attrs2){
      let itemPropertyValue = attrs2[key].property.ext.value.toLowerCase();
      let itemPropertyPrefix = attrs2[key].property.ext.prefix;
      if(item1Property === itemPropertyValue){
        if(item1PropertyPrefix !== itemPropertyPrefix){
          return true;
        }
        if(!this.checkValueTokenEqual(item1.value, attrs2[key].value)){
          return true;
        }
      }
      if(item1Property.indexOf('-') > -1){
        if(item1Property.indexOf(itemPropertyValue + '-') > -1){
          return true;
        }
      }else{
        if(itemPropertyValue.indexOf(item1Property + '-') > -1){
          return true;
        }
      }
    }
    return false;
  }
  /**
   * get assoc selector token
   */
  getAssocSelectorToken(se1, se2){
    let value = se1.value + ',' + se2.value;
    let token = createToken(TokenType.CSS_SELECTOR, value, se1);
    let equal = false;
    if(se1.ext.specificityEqual && se2.ext.specificityEqual){
      equal = se1.ext.minSpecificity === se2.ext.minSpecificity;
    }
    let group = se1.ext.group.concat(se2.ext.group);
    token.ext = {
      minSpecificity: Math.min(se1.ext.minSpecificity, se2.ext.minSpecificity),
      maxSpecificity: Math.max(se1.ext.maxSpecificity, se2.ext.maxSpecificity),
      specificityEqual: equal,
      group
    };
    return token;
  }
  /**
   * get selector intersect
   */
  getSelectorsIntersect(selectors){
    while(1){
      let length = selectors.length;
      if(length < 2){
        break;
      }
      let result = [];
      let flag = false;
      for(let index = 0; index < length - 1; index++){
        let assoc = null;
        if(this.selectorCanCombine([selectors[index], selectors[index + 1]])){
          assoc = this.getPropertiesIntersect(selectors[index], selectors[index + 1]);
        }
        if(assoc){
          for(let key in assoc){
            delete selectors[index].attrs[key];
            delete selectors[index + 1].attrs[key];
          }
          flag = true;
          let assocSelectorToken = this.getAssocSelectorToken(selectors[index].selector, selectors[index + 1].selector);
          result.push({
            attrs: assoc,
            selector: assocSelectorToken
          });
        }
        if(Object.keys(selectors[index].attrs).length){
          result.push(selectors[index]);
        }
      }
      if(Object.keys(selectors[length - 1].attrs).length){
        result.push(selectors[length - 1]);
      }
      selectors = result;
      if(!flag){
        break;
      }
    }
    return selectors;
  }
  /**
   * sort selectors
   */
  sortSelectors(selectors){
    return selectors.sort((se1, se2) => {
      let se1Ext = se1.selector.ext;
      let se2Ext = se2.selector.ext;
      if(!se1Ext.specificityEqual || !se2Ext.specificityEqual){
        if(se1Ext.minSpecificity > se2Ext.maxSpecificity){
          return 1;
        }else if(se1Ext.maxSpecificity < se2Ext.minSpecificity){
          return -1;
        }
        return 0;
      }
      if(se1Ext.minSpecificity === se2Ext.minSpecificity){
        return 0;
      }
      return se1Ext.minSpecificity < se2Ext.minSpecificity ? -1 : 1;
    });
  }
  /**
   * remove exist selector
   */
  compressSelectorToken(selector){
    let group = selector.ext.group;
    if(group.length === 1){
      return selector;
    }
    let keys = {}, ret = [];
    group.forEach(item => {
      let key = selectorGroupToken2Text(item);
      if(!(key in keys)){
        ret.push(item);
        keys[key] = true;
      }
    });
    selector.ext.group = ret;
    return selector;
  }
  /**
   * selector to tokens
   */
  selectorToTokens(selectors){
    let ret = [];

    let leftBrace = createToken(TokenType.CSS_LEFT_BRACE, '{');
    let colon = createToken(TokenType.CSS_COLON, ':');
    let rightBrace = createToken(TokenType.CSS_RIGHT_BRACE, '}');
    let semicolon = createToken(TokenType.CSS_SEMICOLON, ';');

    selectors.forEach(item => {
      item.selector = this.compressSelectorToken(item.selector);
      ret.push(item.selector, leftBrace);
      let attrs = Object.keys(item.attrs).map(key => item.attrs[key]);
      let length = attrs.length;
      attrs.forEach((attr, index) => {
        if(attr.property){
          ret.push(attr.property, colon);
        }
        ret.push(attr.value);
        if(attr.value.type !== TokenType.TPL){
          if(!this.options.removeLastSemicolon || index < length - 1){
            ret.push(semicolon);
          }
        }
      });
      ret.push(rightBrace);
    });
    return ret;
  }
  /**
   * compress selector
   */
  compressSelector(){
    let keys = Object.keys(this.selectors);
    if(keys.length === 0){
      return;
    }
    let selectors = keys.map(key => this.selectors[key]);
    this.selectors = {};

    if(this.options.sortSelector){
      selectors = this.sortSelectors(selectors);
    }

    let se = [], result = [];
    selectors.forEach(item => {
      if(item.selector.ext.specificityEqual){
        se.push(item);
      }else{
        se = this.getSelectorsIntersect(se);
        result = result.concat(se);
        result.push(item);
        se = [];
      }
    });
    if(se.length){
      se = this.getSelectorsIntersect(se);
      result = result.concat(se);
    }
    let tokens = this.selectorToTokens(result);
    this.result.push(...tokens);
  }
  /**
   * run
   */
  run(retTokens = false){
    this.initTokens();
    let hasCharset = false;
    let sortSelector = this.options.sortSelector;
    let sortProperty = this.options.sortProperty;
    let selectorPos = 0;
    let property = '';
    while (this.index < this.length) {
      let token = this.tokens[this.index++];
      switch(token.type){
        case TokenType.CSS_SELECTOR:
          this.collectSelector(token, selectorPos++);
          break;
        case TokenType.CSS_VALUE:
          token.ext.value = this.compressValue(token.ext.value, property);
          this.result.push(token);
          break;
        case TokenType.CSS_RIGHT_BRACE:
          if(this.index > 1 && this.tokens[this.index - 2].type === TokenType.CSS_RIGHT_BRACE){
            this.compressSelector();
            this.options.sortProperty = sortProperty;
            this.options.sortSelector = sortSelector;
            this.inKeyframes = false;
            this.result.push(token);
            break;
          }
        case TokenType.CSS_KEYFRAMES:
          this.options.sortSelector = false;
          this.options.sortProperty = false;
          this.inKeyframes = true;
        default:
          if(isAtType(token.type)){
            this.compressSelector();
          }
          if(token.type === TokenType.CSS_PROPERTY){
            property = token.ext.value.toLowerCase();
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
    return retTokens ? this.result : token2Text(this.result);
  }
}