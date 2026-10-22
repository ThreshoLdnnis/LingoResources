import test from 'node:test';
import assert from 'node:assert/strict';
import {pageInfo,pageNumbers} from '../lib/pagination.mjs';
test('pagination covers an empty list and clamps a shortened list',()=>{
  assert.deepEqual(pageInfo(0,13,12),{page:1,pages:1,offset:0,start:0,end:0,total:0,pageSize:12});
  assert.equal(pageInfo(5,13,12).page,1);
  assert.equal(pageInfo(156,99,12).page,13);
});
test('every record appears exactly once across full and partial pages',()=>{
  for(const [count,size] of [[156,12],[25,12],[189,20]]) {
    const source=Array.from({length:count},(_,i)=>i);
    const collected=[];
    for(let page=1;page<=pageInfo(count,1,size).pages;page++){
      const info=pageInfo(count,page,size);
      collected.push(...source.slice(info.offset,info.end));
    }
    assert.deepEqual(collected,source);
  }
});
test('page controls include the first, last and active pages without duplicates',()=>{
  for(let page=1;page<=80;page++){
    const ns=pageNumbers(page,80).filter(n=>typeof n==='number');
    assert.equal(ns[0],1);assert.equal(ns.at(-1),80);
    assert.ok(ns.includes(page));assert.equal(new Set(ns).size,ns.length);
    assert.ok(pageNumbers(page,80).length<=9);
  }
});
