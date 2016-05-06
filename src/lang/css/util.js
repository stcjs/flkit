import TokenType from '../../util/token_type.js';
import SelectorTokenize from './selector_tokenize.js';
import {makePredicate} from '../../util/util.js';
import config from './config.js';

/**
 * is attribute char
 * @return {Boolean} [description]
 */
export function isAttrChar(code) {
  // >= a && <= z or - 
  return code >= 0x61 && code <= 0x7a || code === 0x2d;
}

/**
 * Calculating a selector's specificity
 * @param  {Array} tokens [selector tokens]
 * @return {Number}        []
 */
export function calculateSelectorSpecificity(tokens){
  let i = 0, length = tokens.length, token, specificity = 0, instance;
  for(; i < length; i++){
    token = tokens[i];
    switch(token.type){
      case TokenType.CSS_SELECTOR_ID:
        specificity += 100;
        break;
      case TokenType.CSS_SELECTOR_TYPE:
      case TokenType.CSS_SELECTOR_PSEUDO_ELEMENT:
        specificity += 1;
        break;
      case TokenType.CSS_SELECTOR_CLASS:
      case TokenType.CSS_SELECTOR_ATTRIBUTE:
        specificity += 10;
        break;
      case TokenType.CSS_SELECTOR_PSEUDO_CLASS:
        if (/^:not\(/i.test(token.value)) {
          instance = SelectorTokenize(token.value.slice(5, -1));
          specificity += instance.run().group[0].specificity;
        }else{
          specificity += 10;
        }
        break;
    }
  }
  return specificity;
}

export const isHackChar = makePredicate(config.propertyHackPrefix);