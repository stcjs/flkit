import token_type from './util/token_type.js';
import BaseTemplate from './template/base.js';
import css_tokenize from './lang/css/tokenize.js';
import css_selector_tokenize from './lang/css/selector_tokenize.js';
import html_tokenize from './lang/html/tokenize.js';
import {token2Text as html_token_2_text} from './lang/html/util.js';
import {token2Text as css_token_2_text} from './lang/css/util.js';
import html_compress from './lang/html/compress.js';
//import BaseTokenize from './util/tokenize.js';
import css_compress from './lang/css/compress.js';
import {createToken as create_token} from './util/util_ext.js';


export const TokenType = token_type;
export const Template = BaseTemplate;

export const CssTokenize = css_tokenize;
export const CssSelectorTokenize = css_selector_tokenize;
export const cssToken2Text = css_token_2_text;
export const CssCompress = css_compress;

export const HtmlTokenize = html_tokenize;
export const htmlToken2Text = html_token_2_text;
export const HtmlCompress = html_compress;


export const createToken = create_token;

/**
 * has template syntax in text
 */
export function hasTpl(text, options = {}) {
  let instance = new BaseTemplate(text, options);
  return instance.hasTpl();
}

/**
 * get html attribute value
 */
export function getHtmlAttrValue(attrs, name){
  let value;
  attrs.some(item => {
    if(item.nameLowerCase === name){
      value = item.value;
      return true;
    }
  });
  return value;
}