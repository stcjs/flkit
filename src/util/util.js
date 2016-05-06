
import {whitespace} from './config.js';

/**
 * string to object
 * @param  {String | Array} str []
 * @return {Object}     []
 */
export function toHash(str) {
  if (typeof str === 'string') {
      str = str.split('');
  }
  let ret = {};
  let length = str.length;
  for(let i = 0; i < length; i++){
      ret[str[i]] = 1;
  }
  return ret;
}
/**
 * make compare function
 * @param  {String} string []
 * @return {Function}        []
 */
export function makePredicate(string) {
  let code = 'switch(code){\n';
  string.split('').forEach(function(chr){
    code += '  case 0x' + chr.charCodeAt(0).toString(16) + ':\n';
  });
  code += '    return true;\n}\nreturn false';
  return new Function('code', code);
}

export let isWhiteSpace = makePredicate(whitespace);