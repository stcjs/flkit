'use strict';

import fs from 'fs';
import path from 'path';
import Base from './base.js';
import {
  CssTokenize, 
  CssSelectorTokenize,
  HtmlTokenize,
  HtmlCompress
} from '../../../lib/index.js';

const lang = {
  html: {
    tokenize: {

    },
    compress: {

    }
  },
  css: {
    tokenize: {
      parseSelector: false,
      parseValue: false
    },
    selector_tokenize: {
      
    }
  }
}

const classList = {
  html: {
    tokenize: HtmlTokenize,
    compress: HtmlCompress
  },
  css: {
    tokenize: CssTokenize,
    selector_tokenize: CssSelectorTokenize
  }
}


export default class extends Base {
  init(...args){
    super.init(...args);
  }
  /**
   * index action
   * @return {Promise} []
   */
  indexAction(){
    this.assign('lang', lang);
    //render View/Home/index_index.html file
    this.display();
  }
  /**
   * list
   */
  listAction(){
    let lang = this.get('lang');
    let name = this.get('name');
    try{
      let cls = classList[lang][name];
    }catch(e){
      return this.error(101, 'params error');
    }
    let file = think.ROOT_PATH + '/../test/' + lang + '_' + name + '.json';
    if (!think.isFile(file)) {
      return this.success([]);
    }
    let content = fs.readFileSync(file, 'utf8') || '{}';
    let data = Object.values(JSON.parse(content));
    let result = [];
    data.forEach(function(item){
      let instance = new classList[lang][name](item.code, think.extend({
        tpl: item.tpl,
        ld: (item.ld || '').split(','),
        rd: (item.rd || '').split(',')
      }, item.options));
      try{
        let ret = instance.run();
        if (typeof result === 'string') {
          item.success = item.result === ret;
        }else{
          item.success = JSON.stringify(item.result) === JSON.stringify(ret);
        }
      }catch(e){
        item.success = item.result === e.toString();
      }
      if (item.success) {
        delete item.result;
      }
      if (item.success) {
        result.push(item)
      }else{
        result.unshift(item);
      }
    })
    return this.success(result);
  }
  testAction(){
    let lang = this.post('lang');
    let name = this.post('name');
    let code = this.post('code');
    let tpl = this.post('tpl');
    let ld = this.post('ld');
    let rd = this.post('rd');
    let instance;
    try{
      let options = JSON.parse(this.post('options') || '{}');
      instance = new classList[lang][name](code, think.extend({
        tpl: tpl,
        ld: (ld || '').split(','),
        rd: (rd || '').split(',')
      }, options));
    }catch(e){
      console.log(e.toString(), e.stack)
      return this.error(101, 'params error');
    }
    try{
      let result = instance.run();
      return this.success(result);
    }catch(e){
      console.log(e.stack);
      return this.error(100, e.toString());
    }
  }
  saveAction(){
    let lang = this.post('lang') || 'html';
    let name = this.post('name') || 'lexer';
    let code = this.post('code');
    let tpl = this.post('tpl');
    let ld = this.post('ld');
    let rd = this.post('rd');
    let result;
    let instance;
    let options;
    try{
      options = JSON.parse(this.post('options') || '{}');
      //let instance = flkit.getInstance(lang, name, code);
      instance = new classList[lang][name](code, think.extend({
        tpl: tpl,
        ld: (ld || '').split(','),
        rd: (rd || '').split(',')
      }, options));
    }catch(e){
      return this.error(101, 'params error');
    }
    try{
      result = instance.run();
    }catch(e){
      result = e.toString();
    }
    let data = {
      lang: lang,
      name: name,
      code: code,
      tpl: tpl,
      ld: ld,
      rd: rd,
      options: options
    }
    let key = think.md5(JSON.stringify(data));
    data.key = key;
    data.result = result;
    let file = path.normalize(think.ROOT_PATH + '/../test/' + lang + '_' + name + '.json');
    let allData = {};
    if (think.isFile(file)) {
      allData = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    }
    allData[key] = data;
    fs.writeFileSync(file, JSON.stringify(allData, undefined, 2));
    return this.success();
  }
}