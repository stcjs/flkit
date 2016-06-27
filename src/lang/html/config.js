import TokenType from '../../util/token_type.js';
import {toHash} from '../../util/util.js';

/**
 * special tokens
 * @type {Array}
 */
export const specialTokens = [
  ['<!--[if', [']><!-->', ']>-->', ']>'], TokenType.IE_HACK],
  ['<![if ', ']>', TokenType.IE_HACK],
  ['<![endif', [']>', ']-->'], TokenType.IE_HACK],
  ['<!--<![endif', ']-->', TokenType.IE_HACK],
  ['<!--#', '-->', TokenType.IE_HACK],
  ['<!doctype ', '>', TokenType.HTML_DOCTYPE],
  ['<!--!', '-->', TokenType.RESERVED_COMMENT],
  ['<![cdata[', ']]>', TokenType.HTML_CDATA]
];

/**
 * html raw element tokens
 * @type {Array}
 */
export const rawTokens = [
  ['<script', '</script', TokenType.HTML_TAG_SCRIPT],
  ['<style', '</style', TokenType.HTML_TAG_STYLE],
  ['<pre', '</pre', TokenType.HTML_TAG_PRE],
  ['<textarea', '</textarea', TokenType.HTML_TAG_TEXTAREA]
];

/**
 * reserved comment prefix
 * @type {Array}
 */
export const reservedCommentPrefix = ['<!--#', '<!--[if', '<!--!', '<!--<![endif', '<![if '];

/**
 * void elements
 * http://www.w3.org/TR/html5/syntax.html#void-elements
 * @type {Object}
 */
export const voidElements = toHash([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 
  'link', 'meta', 'param', 'source', 'track', 'wbr',
  //common self closing svg elements
  'path', 'circle', 'ellipse', 'line', 'rect', 'use', 'stop', 'polyline', 'polygone'
]);

/**
 * safe attribute value regexp
 * @type {RegExp}
 */
export const safeAttrValueReg = /^[\w\/\-\:\.\?\&\=]+$/;

/**
 * optional end tags
 * http://www.w3.org/TR/html5/syntax.html 8.1.2.4 Optional tags
 * @type {Object}
 */
export const optionalEndTags = {
  html: {
    next_comment: false
  },
  head: {
    next_comment: false, 
    next_space: false
  },
  body: {
    next_comment: false
  },
  li: {
    next_element: ['li'],
    next_parent: true
  },
  dt: {
    next_element: ['dt', 'dd']
  },
  dd: {
    next_element: ['dt', 'dd'],
    next_parent: true
  },
  p: {
    /*jslint maxlen: 500 */
    next_element: [
      'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'footer', 'form', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'nav', 'ol', 'p', 
      'pre', 'section', 'table'
    ],
    parent_not: ['a']
  },
  rb: {
    next_element: ['rb', 'rt', 'rtc', 'rp'],
    next_parent: true
  },
  rt: {
    next_element: ['rb', 'rt', 'rtc', 'rp'],
    next_parent: true
  },
  rtc: {
    next_element: ['rb', 'rtc', 'rp'],
    next_parent: true
  },
  rp: {
    next_element: ['rb', 'rt', 'rtc', 'rp'],
    next_parent: true
  },
  optgroup: {
    next_element: ['optgroup'],
    next_parent: true
  },
  option: {
    next_element: ['option', 'optgroup'],
    next_parent: true
  },
  colgroup: {
    next_space: false, 
    next_comment: false
  },
  thead: {
    next_element: ['tbody', 'tfoot']
  },
  tbody: {
    next_element: ['tbody', 'tfoot'],
    next_parent: true
  },
  tfoot: {
    next_element: ['tbody'],
    next_parent: true
  },
  tr: {
    next_element: ['tr'],
    next_parent: true
  },
  td: {
    next_element: ['td', 'th'],
    next_parent: true
  },
  th: {
    next_element: ['td', 'th'],
    next_parent: true
  }
};
/**
 * optional attribute value
 * @type {Object}
 */
export const optionalAttrsValue = {
  '*': {
    'class': '',
    alt: '',
    title: '',
    style: '',
    id: '',
    name: ''
  },
  link: {
    media: 'screen',
    type: 'text/css'
  },
  // maybe use input[type="text"] in css
  /*input: {
    type: 'text'
  }*/
  form: {
    method: 'get'
  },
  style: {
    type: 'text/css',
    rel: 'stylesheet'
  },
  script: {
    type: 'text/javascript',
    language: 'javascript'
  }
};
/**
 * Empty attribute syntax
 * http://www.w3.org/TR/html5/syntax.html#syntax-attribute-name
 * @type {Object}
 */
export const emptyAttributes = toHash(['disabled', 'selected', 'checked', 'readonly', 'multiple']);

/**
 * in safe tag, can remove space before it
 * @type {Object}
 */
export const safeTags = toHash(['html', 'meta', 'style', 'script', 'head', 'link', 'title', 'body', 'noscript']);
/**
 * block tags
 * @type {[type]}
 */
export const blockTags = toHash([
  'html', 'meta', 'style', 'script', 'head', 'link', 'title', 'body', 'noscript', 'address', 'blockquote',
  'center', 'dir', 'div', 'dl', 'fieldset', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'menu', 'noframes',
  'noscript', 'ol', 'p', 'pre', 'table', 'ul', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'section', 'header',
  'footer', 'hgroup', 'nav', 'dialog', 'datalist', 'details', 'figcaption', 'figure', 'meter', 'output', 'progress'
]);
/**
 * html parse insertion mode
 * @type {Object}
 */
export const insertionMode = {
  INITIAL: 0x100,
  BEFORE_HTML: 0x101,
  BEFORE_HEAD: 0x102,
  IN_HEAD: 0x103,
  IN_HEAD_NOSCRIPT: 0x104,
  AFTER_HEAD: 0x105,
  IN_BODY: 0x106,
  TEXT: 0x107,
  IN_TABLE: 0x108,
  IN_TABLE_TEXT: 0x109,
  IN_CAPTION: 0x10a,
  IN_COLUMN_GROUP: 0x10b,
  IN_TABLE_BODY: 0x10c,
  IN_ROW: 0x10d,
  IN_CELL: 0x10e,
  IN_SELECT: 0x10f,
  IN_SELECT_IN_TABLE: 0x110,
  IN_TEMPLATE: 0x111,
  AFTER_BODY: 0x112,
  IN_FRAMESET: 0x113,
  AFTER_AFTER_BODY: 0x114,
  AFTER_AFTER_FRAMESET: 0x115
};