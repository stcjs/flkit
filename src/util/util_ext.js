import BaseTokenize from './tokenize.js';

const baseTokenizeInstance = new BaseTokenize('');
/**
 * create token
 */
export function createToken(type, value, referToken){
  let token = baseTokenizeInstance.getToken(type, value);
  if(referToken){
    token.start = referToken.start;
  }
  token.end = token.start + value.length;
  return token;
}