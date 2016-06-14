import TokenType from '../../util/token_type.js';
import {hasSpaceBetweenTokens} from '../../util/util.js';

/**
 * check code is tag name first char
 * @param  {Number}  code [char code]
 * @return {Boolean}      []
 */
export function isTagFirstChar(code){
  // a-z ! ? /
  return code >= 0x61 && code <= 0x7a || code === 0x3f || code === 0x21 || code === 0x2f;
}
/**
 * check code is tag name char
 * @param  {Number}  code [char code]
 * @return {Boolean}      []
 */
export function isTagNameChar(code){
  // a-z 0-9 : - 
  return code >= 0x61 && code <= 0x7a || code === 0x3a || code === 0x2d || code >= 0x30 && code <= 0x39;
}
/**
 * parse script token attribute
 * @param  {Object} token []
 * @return {Object}             []
 */
export function parseScriptAttrs(token){
  let isScript = false, isExternal = false, type = '';
  let attrs = token.detail.attrs || [], i = 0, item;
  for(; item = attrs[i++]; ){
    switch(item.name){
      case 'src':
        isExternal = true;
        break;
      case 'type':
        type = (item.value || '').toLowerCase();
        break;
    }
  }
  if(!type || type === 'text/javascript'){
    isScript = true;
  }
  token.ext.isScript = isScript;
  token.ext.isExternal = isExternal;
  token.ext.type = type;
  return token;
}
/**
 * parse style attr
 * @param  {Object} token []
 * @return {Object}       []
 */
export function parseStyleAttrs(token){
  var isStyle = true, attrs = token.attrs || [], i = 0, item, value;
  for(; item = attrs[i++]; ){
    if (item.name === 'type') {
      value = (item.value || '').toLowerCase();
      if (value && value !== 'text/css') {
        isStyle = false;
      }
      break;
    }
  }
  token.ext.isStyle = isStyle;
  return token;
}
/**
 * tag attrs to text
 */
export function attrs2Text(attrs = []){
  return attrs.map(attr => {
    // is tpl
    if(attr.type === TokenType.TPL){
      return (attr.spaceBefore ? ' ' : '') + attr.value;
    }
    let quote = attr.quote || '';
    if('value' in attr){
      return attr.name + '=' + quote + attr.value + quote + ' ';
    }
    return attr.name + ' ';
  }).join('').trim();
}
/**
 * tokens to text
 */
export function token2Text(tokens = []){
  return tokens.map(token => {
    
  }).join('');
}