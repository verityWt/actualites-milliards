import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSpeechMetrics,experimentalSensitivity,validateSpeechSamples} from '../src/behavioral-analysis.mjs';
const sample={text:'We will build our future, and we will continue to work',url:'https://example.org/original',date:'2026-11-25',language:'en',kind:'quotation',reviewed:true};
test('deterministic lexical counts',()=>{
 const a=publicSpeechMetrics(sample),b=publicSpeechMetrics(sample);
 assert.deepEqual(a,b);assert.equal(a.frequencies.collective,2);assert.equal(a.frequencies.future,3);
});
test('experimental sensitivity does not claim psychometrics',()=>{
 const x=experimentalSensitivity(sample);
 assert.equal(x.status,'experimental_computation');assert.equal(x.transformed,true);
 assert.equal(x.changeInTermCounts.future,-2);
 assert.match(x.limitation,/No psychometric validity/);
});
test('no comma leaves protocol unchanged',()=>{
 const x=experimentalSensitivity({...sample,text:'We will work together'});
 assert.equal(x.transformed,false);
 assert.ok(Object.values(x.changeInTermCounts).every(v=>v===0));
});
test('unreviewed excerpts rejected',()=>{
 assert.throws(()=>validateSpeechSamples([{...sample,reviewed:false}]),/Invalid editorial/);
 assert.equal(validateSpeechSamples([sample]),true);
});
