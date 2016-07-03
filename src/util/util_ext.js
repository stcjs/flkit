import BaseTokenize from './tokenize.js';

const baseTokenizeInstance = new BaseTokenize('');
/**
 * create token
 */
export function createToken(type, value, referToken){
  let token = baseTokenizeInstance.getToken(type, value);
  token.start = referToken ? referToken.start : 0;
  token.end = token.start + value.length;
  return token;
}