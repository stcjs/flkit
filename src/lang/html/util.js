import TokenType from '../../util/token_type.js';
import {hasSpaceBetweenTokens} from '../../util/util.js';
import {
  tagAttrDefaultValue,
  tagAttrOnlyName,
  optionalEndTag,
  voidElements,
  safeTags,
  allTags
} from './config.js';

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
export function parseScriptAttrs(token, jsTplTypes = []){
  let isScript = false, isExternal = false, type = '';
  let attrs = token.ext.attrs || [], i = 0, item;
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
  token.ext.isTpl = !isScript && jsTplTypes && jsTplTypes.indexOf(type) > -1;
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
    if('value' in attr && 'name' in attr){
      return attr.name + '=' + quote + attr.value + quote + ' ';
    }
    if('value' in attr){
      return attr.value + ' ';
    }
    return attr.name + ' ';
  }).join('').trim();
}

/**
 * start token to text
 */
const startToken2Text = token => {
  let attrText = attrs2Text(token.ext.attrs);
  if(attrText){
    attrText = ' ' + attrText;
  }
  // slash on single tag
  if(token.ext.slash){
    attrText += ' /';
  }
  return `<${token.ext.tag}${attrText}>`;
};

/**
 * tokens to text
 */
export function token2Text(tokens = [], stringify = {
  css: null,
  js: null
}){
  let prevToken = null;
  let result = [];

  tokens.forEach(token => {
    // has space between tokens
    if(hasSpaceBetweenTokens(prevToken, token)){
      result.push(' ');
    }
    // has comment
    if(token.commentBefore.length){
      token.commentBefore.forEach(item => {
        result.push(item.value);
      });
    }
    let contentToken;
    switch(token.type){
      case TokenType.HTML_TAG_START:
        result.push(startToken2Text(token));
        break;
      case TokenType.HTML_TAG_STYLE:
        let start = startToken2Text(token.ext.start);
        result.push(start);
        contentToken = token.ext.content;
        if(!stringify.css || !contentToken.ext.tokens){
          result.push(contentToken.value);
        }else{
          result.push(stringify.css(contentToken.ext.tokens));
        }
        result.push(token.ext.end.value);
        break;
      case TokenType.HTML_TAG_SCRIPT:
        let startToken = token.ext.start;
        result.push(startToken2Text(startToken));
        contentToken = token.ext.content;
        if(contentToken.ext.tokens){
          if(startToken.ext.isScript){
            result.push(stringify.js(contentToken.ext.tokens));
          }else if(startToken.ext.isTpl){
            result.push(token2Text(contentToken.ext.tokens));
          }
        }else{
          result.push(contentToken.value);
        }
        result.push(token.ext.end.value);
        break;
      case TokenType.HTML_TAG_END:
        result.push(`</${token.ext.tag}>`);
        break;
      default:
        result.push(token.value);
        break;
    }
    prevToken = token;
  });
  return result.join('');
}

/**
 * is tag attribute default value
 */
export function isTagAttrDefaultValue(name, value, tag){
  let lowerValue = (value || '').toLowerCase();
  for(let key in tagAttrDefaultValue){
    let attrs = tagAttrDefaultValue[key];
    if(key === '*' || key === tag){
      for(let attrName in attrs){
        if(attrName === name && lowerValue === attrs[attrName]){
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * tag attribute only has name
 */
export function isTagAttrOnlyName(attr){
  return !!tagAttrOnlyName[attr];
}
/**
 * attribute value no quote
 */
export function isAttrValueNoQuote(value){
  return /^\w+$/.test(value);
}

/**
 * check is optional end tag
 */
export function isOptionalEndTag(tag, list){
  list = list || optionalEndTag;
  if(Array.isArray(list)){
    return list.indexOf(tag) > -1;
  }
  return !!list[tag];
}

/**
 * check is void element
 */
export function isVoidElement(tag){
  return !!voidElements[tag];
}
/**
 * is standard tag
 */
export function isTag(tag){
  return !!allTags[tag];
}

/**
 * is safe tag
 */
export function isSafeTag(tag){
  return !!safeTags[tag]; 
}